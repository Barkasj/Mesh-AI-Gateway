#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$REPO_ROOT"

if ! command -v rg >/dev/null 2>&1; then
  echo "rebranding-audit requires ripgrep (rg) in PATH." >&2
  exit 1
fi

# Keep this list focused on runtime + release surfaces.
TARGETS=(
  "README.md"
  "REBRANDING.md"
  "transports/README.md"
  "transports/config.schema.json"
  "transports/bifrost-http/main.go"
  "transports/bifrost-http/lib"
  "transports/bifrost-http/server"
  "framework/modelcatalog"
  "framework/plugins/soloader.go"
  "npx/bin.js"
  "ui/README.md"
  "ui/app"
  "ui/components"
  "ui/lib/store/apis"
  "helm-charts/bifrost"
  ".github/workflows/configs"
  ".github/workflows/scripts/run-migration-tests.sh"
)

BANNED_REGEX='docs\.getbifrost\.ai|https?://(www\.)?getbifrost\.ai|https?://(www\.)?getmaxim\.ai/bifrost|https?://getmax\.im/bifrost-discord|https?://downloads\.getmaxim\.ai|https?://github\.com/maximhq/bifrost|https?://hub\.docker\.com/r/maximhq/bifrost|https?://maximhq\.github\.io/bifrost/helm-charts|docker\.io/maximhq/bifrost'

EXISTING_TARGETS=()
for target in "${TARGETS[@]}"; do
  if [[ -e "$target" ]]; then
    EXISTING_TARGETS+=("$target")
  fi
done

if [[ ${#EXISTING_TARGETS[@]} -eq 0 ]]; then
  echo "No rebranding audit targets found."
  exit 0
fi

is_allowed_match() {
  local file="$1"
  local text="$2"

  # Legacy schema URL is intentionally accepted for backward compatibility.
  if [[ "$text" == *"https://www.getbifrost.ai/schema"* ]]; then
    case "$file" in
      transports/config.schema.json|transports/bifrost-http/lib/config.schema.json|transports/bifrost-http/lib/branding.go)
        return 0
        ;;
    esac
  fi

  # Legacy release endpoint kept as fallback.
  if [[ "$file" == "ui/lib/store/apis/configApi.ts" && "$text" == *"https://getbifrost.ai/latest-release"* ]]; then
    return 0
  fi

  # Legacy binary download endpoint kept as fallback.
  if [[ "$file" == "npx/bin.js" && "$text" == *"https://downloads.getmaxim.ai"* ]]; then
    return 0
  fi

  return 1
}

RAW_MATCHES="$(rg -n --no-heading --glob '!**/*_test.go' --glob '!**/*.sum' --glob '!**/go.mod' -e "$BANNED_REGEX" "${EXISTING_TARGETS[@]}" || true)"

if [[ -z "$RAW_MATCHES" ]]; then
  echo "Rebranding audit passed: no vendor-locked references found in audited surfaces."
  exit 0
fi

FAILURES=()
while IFS= read -r line; do
  [[ -z "$line" ]] && continue

  file="${line%%:*}"
  rest="${line#*:}"
  lineno="${rest%%:*}"
  text="${rest#*:}"

  if is_allowed_match "$file" "$text"; then
    continue
  fi

  FAILURES+=("$file:$lineno:$text")
done <<< "$RAW_MATCHES"

if [[ ${#FAILURES[@]} -gt 0 ]]; then
  echo "Rebranding audit failed. Remove or externalize vendor/proprietary references:"
  printf '  - %s\n' "${FAILURES[@]}"
  exit 1
fi

echo "Rebranding audit passed with only approved legacy compatibility references."
