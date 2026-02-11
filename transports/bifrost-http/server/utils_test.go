package server

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/maximhq/bifrost/transports/bifrost-http/lib"
)

func expectedConfigPaths(root, newDirName, legacyDirName string) (string, string) {
	if runtime.GOOS == "windows" {
		return filepath.Join(root, newDirName), filepath.Join(root, legacyDirName)
	}
	base := filepath.Join(root, ".config")
	return filepath.Join(base, newDirName), filepath.Join(base, legacyDirName)
}

func setConfigRootEnv(t *testing.T, root string) {
	t.Helper()
	t.Setenv("APPDATA", root)
	t.Setenv("HOME", root)
	t.Setenv("USERPROFILE", root)
}

func TestGetDefaultConfigDir_UsesAppDirWhenProvided(t *testing.T) {
	custom := filepath.Join(t.TempDir(), "custom")
	got := GetDefaultConfigDir(custom)
	if got != custom {
		t.Fatalf("expected app-dir override %q, got %q", custom, got)
	}
}

func TestGetDefaultConfigDir_UsesExplicitEnvOverride(t *testing.T) {
	explicit := filepath.Join(t.TempDir(), "explicit-config")
	t.Setenv("MESH_GATEWAY_CONFIG_DIR", explicit)
	got := GetDefaultConfigDir("")
	if got != explicit {
		t.Fatalf("expected explicit env override %q, got %q", explicit, got)
	}
}

func TestGetDefaultConfigDir_UsesLegacyFallbackWhenOnlyLegacyExists(t *testing.T) {
	root := t.TempDir()
	setConfigRootEnv(t, root)
	t.Setenv("MESH_GATEWAY_CONFIG_DIR", "")
	t.Setenv("MESH_GATEWAY_CONFIG_DIR_NAME", "mesh-test-config")
	t.Setenv("MESH_GATEWAY_LEGACY_DIR_FALLBACK", "true")

	preferredPath, legacyPath := expectedConfigPaths(root, "mesh-test-config", lib.LegacyConfigDirName)
	if err := os.MkdirAll(legacyPath, 0o755); err != nil {
		t.Fatalf("failed to create legacy path: %v", err)
	}

	got := GetDefaultConfigDir("")
	if got != legacyPath {
		t.Fatalf("expected legacy path %q when preferred path %q does not exist, got %q", legacyPath, preferredPath, got)
	}
}

func TestGetDefaultConfigDir_PrefersNewPathWhenPresent(t *testing.T) {
	root := t.TempDir()
	setConfigRootEnv(t, root)
	t.Setenv("MESH_GATEWAY_CONFIG_DIR", "")
	t.Setenv("MESH_GATEWAY_CONFIG_DIR_NAME", "mesh-test-config")
	t.Setenv("MESH_GATEWAY_LEGACY_DIR_FALLBACK", "true")

	preferredPath, legacyPath := expectedConfigPaths(root, "mesh-test-config", lib.LegacyConfigDirName)
	if err := os.MkdirAll(preferredPath, 0o755); err != nil {
		t.Fatalf("failed to create preferred path: %v", err)
	}
	if err := os.MkdirAll(legacyPath, 0o755); err != nil {
		t.Fatalf("failed to create legacy path: %v", err)
	}

	got := GetDefaultConfigDir("")
	if got != preferredPath {
		t.Fatalf("expected preferred path %q when it exists, got %q", preferredPath, got)
	}
}

func TestGetDefaultConfigDir_DisablesLegacyFallbackWhenRequested(t *testing.T) {
	root := t.TempDir()
	setConfigRootEnv(t, root)
	t.Setenv("MESH_GATEWAY_CONFIG_DIR", "")
	t.Setenv("MESH_GATEWAY_CONFIG_DIR_NAME", "mesh-test-config")
	t.Setenv("MESH_GATEWAY_LEGACY_DIR_FALLBACK", "false")

	preferredPath, legacyPath := expectedConfigPaths(root, "mesh-test-config", lib.LegacyConfigDirName)
	if err := os.MkdirAll(legacyPath, 0o755); err != nil {
		t.Fatalf("failed to create legacy path: %v", err)
	}

	got := GetDefaultConfigDir("")
	if got != preferredPath {
		t.Fatalf("expected preferred path %q when legacy fallback is disabled, got %q", preferredPath, got)
	}
}
