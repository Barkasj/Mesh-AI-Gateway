#!/usr/bin/env node

import { execFileSync } from "child_process";
import { chmodSync, createWriteStream, existsSync, fsyncSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Readable } from "stream";

const PRODUCT_NAME = process.env.MESH_GATEWAY_PRODUCT_NAME || "Mesh AI Gateway";
const BASE_URL = process.env.MESH_GATEWAY_DOWNLOAD_BASE_URL || "https://releases.mesh-ai-gateway.io";
const LEGACY_BASE_URL = "https://downloads.getmaxim.ai";
const RELEASE_URL = process.env.MESH_GATEWAY_RELEASE_API_URL || `${BASE_URL}/bifrost/latest-release`;
const LEGACY_RELEASE_URL = `${LEGACY_BASE_URL}/bifrost/latest-release`;
const DOWNLOAD_CHANNEL = process.env.MESH_GATEWAY_DOWNLOAD_CHANNEL || "bifrost";
const CACHE_NAMESPACE = process.env.MESH_GATEWAY_CACHE_NAMESPACE || "mesh-ai-gateway";
const DOWNLOAD_BASE_URLS = BASE_URL === LEGACY_BASE_URL ? [BASE_URL] : [BASE_URL, LEGACY_BASE_URL];

// Parse transport version from command line arguments
function parseTransportVersion() {
	const args = process.argv.slice(2);
	let transportVersion = "latest"; // Default to latest

	// Find --transport-version argument
	const versionArgIndex = args.findIndex((arg) => arg.startsWith("--transport-version"));

	if (versionArgIndex !== -1) {
		const versionArg = args[versionArgIndex];

		if (versionArg.includes("=")) {
			// Format: --transport-version=v1.2.3
			transportVersion = versionArg.split("=")[1];
		} else if (versionArgIndex + 1 < args.length) {
			// Format: --transport-version v1.2.3
			transportVersion = args[versionArgIndex + 1];
		}

		// Remove the transport-version arguments from args array so they don't get passed to the binary
		if (versionArg.includes("=")) {
			args.splice(versionArgIndex, 1);
		} else {
			args.splice(versionArgIndex, 2);
		}
	}

	return { version: validateTransportVersion(transportVersion), remainingArgs: args };
}

// Validate transport version format
function validateTransportVersion(version) {
	if (version === "latest") {
		return version;
	}

	// Check if version matches v{x.x.x} format
	const versionRegex = /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
	if (versionRegex.test(version)) {
		return version;
	}

	console.error(`Invalid transport version format: ${version}`);
	console.error(`Transport version must be either "latest", "v1.2.3", or "v1.2.3-prerelease1"`);
	process.exit(1);
}

const { version: VERSION, remainingArgs } = parseTransportVersion();

async function getPlatformArchAndBinary() {
	const platform = process.platform;
	const arch = process.arch;

	let platformDir;
	let archDir;
	let binaryName;

	if (platform === "darwin") {
		platformDir = "darwin";
		if (arch === "arm64") archDir = "arm64";
		else archDir = "amd64";
		binaryName = "bifrost-http";
	} else if (platform === "linux") {
		platformDir = "linux";
		if (arch === "x64") archDir = "amd64";
		else if (arch === "ia32") archDir = "386";
		else archDir = arch; // fallback
		binaryName = "bifrost-http";
	} else if (platform === "win32") {
		platformDir = "windows";
		if (arch === "x64") archDir = "amd64";
		else if (arch === "ia32") archDir = "386";
		else archDir = arch; // fallback
		binaryName = "bifrost-http.exe";
	} else {
		console.error(`Unsupported platform/arch: ${platform}/${arch}`);
		process.exit(1);
	}

	return { platformDir, archDir, binaryName };
}

async function downloadBinary(url, dest) {
	// console.log(`🔄 Downloading binary from ${url}...`);

	const res = await fetch(url);

	if (!res.ok) {
		console.error(`❌ Download failed: ${res.status} ${res.statusText}`);
		process.exit(1);
	}

	const contentLength = res.headers.get("content-length");
	const totalSize = contentLength ? parseInt(contentLength, 10) : null;
	let downloadedSize = 0;

	const fileStream = createWriteStream(dest, { flags: "w" });
	await new Promise((resolve, reject) => {
		try {
			// Convert the fetch response body to a Node.js readable stream
			const nodeStream = Readable.fromWeb(res.body);

			// Add progress tracking
			nodeStream.on("data", (chunk) => {
				downloadedSize += chunk.length;
				if (totalSize) {
					const progress = ((downloadedSize / totalSize) * 100).toFixed(1);
					process.stdout.write(`\r⏱️ Downloading Binary: ${progress}% (${formatBytes(downloadedSize)}/${formatBytes(totalSize)})`);
				} else {
					process.stdout.write(`\r⏱️ Downloaded: ${formatBytes(downloadedSize)}`);
				}
			});

			nodeStream.pipe(fileStream);
			fileStream.on("finish", () => {
				process.stdout.write("\n");

				// Ensure file is fully written to disk
				try {
					fsyncSync(fileStream.fd);
				} catch (syncError) {
					// fsync might fail on some systems, ignore
				}

				resolve();
			});
			fileStream.on("error", reject);
			nodeStream.on("error", reject);
		} catch (error) {
			reject(error);
		}
	});

	chmodSync(dest, 0o755);
}

// Returns the os cache directory path for storing binaries
// Linux: $XDG_CACHE_HOME or ~/.cache
// macOS: ~/Library/Caches
// Windows: %LOCALAPPDATA% or %USERPROFILE%\AppData\Local
function cacheDir() {
	if (process.platform === "linux") {
		return process.env.XDG_CACHE_HOME || join(process.env.HOME || "", ".cache");
	}
	if (process.platform === "darwin") {
		return join(process.env.HOME || "", "Library", "Caches");
	}
	if (process.platform === "win32") {
		return process.env.LOCALAPPDATA || join(process.env.USERPROFILE || "", "AppData", "Local");
	}
	console.error(`Unsupported platform/arch: ${process.platform}/${process.arch}`);
	process.exit(1);
}

// gets the latest version number for transport
async function getLatestVersion() {
	const releaseUrls = RELEASE_URL === LEGACY_RELEASE_URL ? [RELEASE_URL] : [RELEASE_URL, LEGACY_RELEASE_URL];
	for (const url of releaseUrls) {
		try {
			const res = await fetch(url);
			if (!res.ok) {
				continue;
			}
			const data = await res.json();
			const version = data.name || data.tag || data.version || data.tag_name || null;
			if (version) {
				return version;
			}
		} catch (_error) {
			// Try the next release URL
		}
	}
	return null;
}

// Resolve which download base URL contains the requested version.
async function resolveDownloadBaseURL(version, platformDir, archDir, binaryName) {
	for (const baseUrl of DOWNLOAD_BASE_URLS) {
		const url = `${baseUrl}/${DOWNLOAD_CHANNEL}/${version}/${platformDir}/${archDir}/${binaryName}`;
		try {
			const res = await fetch(url, { method: "HEAD" });
			if (res.ok) {
				return baseUrl;
			}
		} catch (_error) {
			// Try the next base URL
		}
	}
	return null;
}

function formatBytes(bytes) {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

(async () => {
	const platformInfo = await getPlatformArchAndBinary();
	const { platformDir, archDir, binaryName } = platformInfo;

	let namedVersion;

	if (VERSION === "latest") {
		// For "latest", fetch the latest version from the API
		namedVersion = await getLatestVersion();
	} else {
		// For explicitly specified versions, verify it exists on the server
		const downloadBase = await resolveDownloadBaseURL(VERSION, platformDir, archDir, binaryName);
		if (!downloadBase) {
			console.error(`❌ Transport version '${VERSION}' not found.`);
			console.error(`Please verify the version exists at one of:`);
			for (const baseUrl of DOWNLOAD_BASE_URLS) {
				console.error(`  - ${baseUrl}/${DOWNLOAD_CHANNEL}/`);
			}
			process.exit(1);
		}
		namedVersion = VERSION;
	}

	// Check if we got a valid version for namedVersion
	// If namedVersion is null, there is no way to get the latest version
	// In that case, we proceed without caching
	const namedVersionFound = !!namedVersion;

	// For future use when we want to add multiple fallback binaries
	const downloadUrls = [];

	for (const baseUrl of DOWNLOAD_BASE_URLS) {
		downloadUrls.push(`${baseUrl}/${DOWNLOAD_CHANNEL}/${VERSION}/${platformDir}/${archDir}/${binaryName}`);
	}

	let lastError = null;
	let binaryWorking = false;

	const gatewayBinDir = namedVersionFound ? join(cacheDir(), CACHE_NAMESPACE, namedVersion, "bin") : tmpdir();
	const legacyBifrostBinDir = namedVersionFound ? join(cacheDir(), "bifrost", namedVersion, "bin") : tmpdir();
	const downloadBinDir = namedVersionFound && !existsSync(gatewayBinDir) && existsSync(legacyBifrostBinDir) ? legacyBifrostBinDir : gatewayBinDir;

	// if the binary directory doesn't exist, create it
	try {
		if (namedVersionFound && !existsSync(downloadBinDir)) {
			mkdirSync(downloadBinDir, { recursive: true });
		}
	} catch (mkdirError) {
		console.error(`❌ Failed to create directory ${downloadBinDir}:`, mkdirError.message);
		process.exit(1);
	}

	for (let i = 0; i < downloadUrls.length; i++) {
		const binaryPath = join(downloadBinDir, `${binaryName}-${i}`);

		if (!namedVersionFound || !existsSync(binaryPath)) {
			await downloadBinary(downloadUrls[i], binaryPath);
			console.log(`✅ Downloaded binary to ${binaryPath}`);

			// Add a small delay to ensure file is fully written and not busy
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		// Test if the binary can execute
		try {
			execFileSync(binaryPath, remainingArgs, { stdio: "inherit" });
			binaryWorking = true;
			break;
		} catch (execError) {
			// If execution fails (ENOENT, ETXTBSY, etc.), try next binary
			lastError = execError;
			continue;
			// Continue to next URL silently
		}
	}

	if (!binaryWorking) {
		console.error(`❌ Failed to start ${PRODUCT_NAME}. Error:`, lastError.message);

		// Show critical error details for troubleshooting
		if (lastError.code) {
			console.error(`Error code: ${lastError.code}`);
		}
		if (lastError.errno) {
			console.error(`System error: ${lastError.errno}`);
		}
		if (lastError.signal) {
			console.error(`Signal: ${lastError.signal}`);
		}

		// For specific Linux issues, show diagnostic info
		if (process.platform === "linux" && (lastError.code === "ENOENT" || lastError.code === "ETXTBSY")) {
			console.error(`\n💡 This appears to be a Linux compatibility issue.`);
			console.error(`   The binary may be incompatible with your Linux distribution.`);
		}

		process.exit(lastError.status || 1);
	}
})();

