package modelcatalog

import (
	"os"
	"strings"
	"time"
)

const (
	DefaultPricingSyncInterval = 24 * time.Hour
	ConfigLastPricingSyncKey   = "LastModelPricingSync"
	DefaultPricingTimeout      = 45 * time.Second
)

const (
	defaultPricingURL = "https://pricing.mesh-ai-gateway.io/datasheet"
	legacyPricingURL  = "https://pricing.mesh-ai-gateway.io/datasheet"
)

// DefaultPricingURL returns the default pricing URL used by model catalog sync.
// Override with MESH_GATEWAY_PRICING_URL to fully control the data source.
func DefaultPricingURL() string {
	if url := strings.TrimSpace(os.Getenv("MESH_GATEWAY_PRICING_URL")); url != "" {
		return url
	}
	return defaultPricingURL
}

// LegacyPricingURL is kept for compatibility with existing deployments.
func LegacyPricingURL() string {
	return legacyPricingURL
}

// Config is the model pricing configuration.
type Config struct {
	PricingURL          *string        `json:"pricing_url,omitempty"`
	PricingSyncInterval *time.Duration `json:"pricing_sync_interval,omitempty"`
}
