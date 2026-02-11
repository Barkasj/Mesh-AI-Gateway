package lib

import "testing"

func TestConfigSchemaURL_DefaultAndOverride(t *testing.T) {
	t.Setenv("MESH_GATEWAY_SCHEMA_URL", "")
	if got := ConfigSchemaURL(); got != DefaultSchemaURL {
		t.Fatalf("expected default schema URL %q, got %q", DefaultSchemaURL, got)
	}

	custom := "https://example.org/custom.schema.json"
	t.Setenv("MESH_GATEWAY_SCHEMA_URL", custom)
	if got := ConfigSchemaURL(); got != custom {
		t.Fatalf("expected overridden schema URL %q, got %q", custom, got)
	}
}

func TestIsAcceptedSchemaURL(t *testing.T) {
	t.Setenv("MESH_GATEWAY_SCHEMA_URL", "")
	if !IsAcceptedSchemaURL(DefaultSchemaURL) {
		t.Fatalf("expected default schema URL to be accepted")
	}
	if !IsAcceptedSchemaURL(LegacySchemaURL) {
		t.Fatalf("expected legacy schema URL to be accepted")
	}
	if IsAcceptedSchemaURL("https://invalid.example/schema.json") {
		t.Fatalf("did not expect arbitrary schema URL to be accepted")
	}
	if IsAcceptedSchemaURL("") {
		t.Fatalf("did not expect empty schema URL to be accepted")
	}
}

func TestUseLegacyConfigDirFallbackBehavior(t *testing.T) {
	t.Setenv("MESH_GATEWAY_LEGACY_DIR_FALLBACK", "")
	if !UseLegacyConfigDirFallback() {
		t.Fatalf("expected legacy fallback to be enabled by default")
	}

	t.Setenv("MESH_GATEWAY_LEGACY_DIR_FALLBACK", "false")
	if UseLegacyConfigDirFallback() {
		t.Fatalf("expected legacy fallback to be disabled when explicitly set to false")
	}

	t.Setenv("MESH_GATEWAY_LEGACY_DIR_FALLBACK", "0")
	if UseLegacyConfigDirFallback() {
		t.Fatalf("expected legacy fallback to be disabled when explicitly set to 0")
	}

	t.Setenv("MESH_GATEWAY_LEGACY_DIR_FALLBACK", "true")
	if !UseLegacyConfigDirFallback() {
		t.Fatalf("expected legacy fallback to be enabled when explicitly set to true")
	}
}
