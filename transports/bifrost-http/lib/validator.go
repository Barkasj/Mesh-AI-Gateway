// Package lib provides core functionality for the Bifrost HTTP service.
// This file contains JSON schema validation for config files.
package lib

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"fmt"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

//go:embed config.schema.json
var embeddedConfigSchema []byte

// ValidateConfigSchema validates config data against the JSON schema.
// Returns nil if valid, or a formatted error describing all validation failures.
func ValidateConfigSchema(data []byte) error {
	if len(embeddedConfigSchema) == 0 {
		logger.Warn("embedded config schema is empty; running without config.json schema validation")
		return nil
	}

	// Parse the schema JSON
	schemaDoc, err := jsonschema.UnmarshalJSON(bytes.NewReader(embeddedConfigSchema))
	if err != nil {
		return fmt.Errorf("failed to parse config schema JSON: %w", err)
	}
	c := jsonschema.NewCompiler()
	if err := c.AddResource("config.schema.json", schemaDoc); err != nil {
		return fmt.Errorf("failed to add config schema resource: %w", err)
	}
	// Compile the schema
	compiledSchema, err := c.Compile("config.schema.json")
	if err != nil {
		return fmt.Errorf("failed to compile config schema: %w", err)
	}
	var v any
	if err := json.Unmarshal(data, &v); err != nil {
		return fmt.Errorf("invalid JSON: %w", err)
	}
	err = compiledSchema.Validate(v)
	if err == nil {
		return nil
	}
	// Format validation errors for better readability
	return formatValidationError(err)
}

// formatValidationError converts jsonschema validation errors into user-friendly messages
func formatValidationError(err error) error {
	validationErr, ok := err.(*jsonschema.ValidationError)
	if !ok {
		return err
	}

	// Use the GoString format which provides detailed hierarchical output
	return fmt.Errorf("schema validation failed:\n%s", validationErr.GoString())
}
