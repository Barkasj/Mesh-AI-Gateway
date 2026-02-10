package lib

import (
	"os"
	"strings"
)

const (
	// DefaultProductName is the public-facing product name for this distribution.
	DefaultProductName = "Mesh AI Gateway"

	// LegacyProductName is kept for compatibility and migration messaging.
	LegacyProductName = "Bifrost"

	// DefaultProjectURL points to the upstream-agnostic open-source repository.
	DefaultProjectURL = "https://github.com/mesh-ai-gateway/mesh-ai-gateway"

	// DefaultDocsURL points to the open-source docs entry.
	DefaultDocsURL = "https://docs.mesh-ai-gateway.io"

	// DefaultConfigDirName is the preferred config directory name for fresh installs.
	DefaultConfigDirName = "mesh-ai-gateway"

	// LegacyConfigDirName is the historic config directory used by upstream Bifrost.
	LegacyConfigDirName = "bifrost"

	// DefaultSchemaURL is the canonical schema reference for Mesh AI Gateway configs.
	DefaultSchemaURL = "https://schema.mesh-ai-gateway.io/config.schema.json"

	// LegacySchemaURL is accepted for backward compatibility.
	LegacySchemaURL = "https://www.getbifrost.ai/schema"
)

// ProductName returns the public-facing product name.
func ProductName() string {
	return firstNonEmpty(os.Getenv("MESH_GATEWAY_PRODUCT_NAME"), DefaultProductName)
}

// ProjectURL returns the public project URL.
func ProjectURL() string {
	return firstNonEmpty(os.Getenv("MESH_GATEWAY_PROJECT_URL"), DefaultProjectURL)
}

// DocsURL returns the docs base URL.
func DocsURL() string {
	return firstNonEmpty(os.Getenv("MESH_GATEWAY_DOCS_URL"), DefaultDocsURL)
}

// ConfigDirName returns the preferred config directory name.
func ConfigDirName() string {
	return firstNonEmpty(os.Getenv("MESH_GATEWAY_CONFIG_DIR_NAME"), DefaultConfigDirName)
}

// ConfigSchemaURL returns the canonical schema URL used for validation messaging.
func ConfigSchemaURL() string {
	return firstNonEmpty(os.Getenv("MESH_GATEWAY_SCHEMA_URL"), DefaultSchemaURL)
}

// UseLegacyConfigDirFallback controls whether we auto-detect legacy Bifrost config directories.
// Set MESH_GATEWAY_LEGACY_DIR_FALLBACK=false to disable this behavior.
func UseLegacyConfigDirFallback() bool {
	raw := strings.TrimSpace(strings.ToLower(os.Getenv("MESH_GATEWAY_LEGACY_DIR_FALLBACK")))
	if raw == "" {
		return true
	}

	switch raw {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return true
	}
}

// IsAcceptedSchemaURL returns true when the provided schema URL is accepted by this distribution.
func IsAcceptedSchemaURL(v string) bool {
	if v == "" {
		return false
	}

	current := ConfigSchemaURL()
	return v == current || v == LegacySchemaURL
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
