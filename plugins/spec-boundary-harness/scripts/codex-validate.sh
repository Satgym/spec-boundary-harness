#!/usr/bin/env bash
# Codex validator runner.
#
# Usage:
#   scripts/codex-validate.sh <inputDir> <featureId>
#
# Behavior:
#   - Read-only sandbox; never modifies repository files.
#   - Uses prompts/codex-validator.md as the system prompt.
#   - Uses schemas/codex-validation-report.schema.json to enforce JSON shape.
#   - Writes reports/codex-validation-report.json and a human-readable .md mirror.
#   - Skips gracefully if codex is unavailable or required flags are missing.

set -u

# PLUGIN_ROOT = where this script and the prompts/schemas live.
# PROJECT_ROOT = where the user's inputs and outputs live.
# These were merged into a single ROOT_DIR before v0.6.1, which broke when
# the script was called from a user project that doesn't contain the plugin.
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ROOT="${ROOT_DIR:-$PLUGIN_ROOT}"

INPUT_DIR="${1:?usage: $0 <inputDir> <featureId>}"
FEATURE_ID="${2:?usage: $0 <inputDir> <featureId>}"

PROMPT_FILE="$PLUGIN_ROOT/prompts/codex-validator.md"
SCHEMA_FILE="$PLUGIN_ROOT/schemas/codex-validation-report.schema.json"
OUTPUT_JSON="$PROJECT_ROOT/reports/codex-validation-report.json"
OUTPUT_MD="$PROJECT_ROOT/reports/codex-validation-report.md"
LOG_FILE="$PROJECT_ROOT/reports/.codex-validate.log"
mkdir -p "$(dirname "$OUTPUT_JSON")"

write_skip() {
  local reason="$1"
  cat > "$OUTPUT_MD" <<EOF
# Codex Validation Report

Status: SKIPPED

Reason: $reason

The harness intentionally avoids invoking Codex unless it can confirm a safe read-only sandbox.
EOF
  cat > "$OUTPUT_JSON" <<EOF
{
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "feature_id": "$FEATURE_ID",
  "input_summary": "Codex was not invoked: $reason",
  "findings": [],
  "notes": "skipped"
}
EOF
}

if ! command -v codex >/dev/null 2>&1; then
  write_skip "codex CLI not found on PATH"
  exit 0
fi
if [ ! -f "$PROMPT_FILE" ]; then
  write_skip "Missing prompt: $PROMPT_FILE"
  exit 0
fi
if [ ! -f "$SCHEMA_FILE" ]; then
  write_skip "Missing schema: $SCHEMA_FILE"
  exit 0
fi
if [ ! -d "$PROJECT_ROOT/specs/$FEATURE_ID" ]; then
  write_skip "No specs/$FEATURE_ID directory; nothing to validate"
  exit 0
fi
if [ ! -d "$INPUT_DIR" ]; then
  write_skip "Input directory not found: $INPUT_DIR"
  exit 0
fi

CODEX_HELP="$(codex exec --help 2>/dev/null || true)"

SANDBOX_FLAG=""
if echo "$CODEX_HELP" | grep -q -- "--sandbox"; then
  SANDBOX_FLAG="--sandbox read-only"
else
  write_skip "codex exec does not expose a confirmed read-only sandbox flag"
  exit 0
fi

# META-03: require --output-schema AND --output-last-message; skip-closed
# rather than fall back to log-scraping, which broke the strict structured-
# output guarantee in the previous version.
SCHEMA_FLAG=""
if echo "$CODEX_HELP" | grep -q -- "--output-schema"; then
  SCHEMA_FLAG="--output-schema $SCHEMA_FILE"
else
  write_skip "codex exec lacks --output-schema; refusing to run without strict JSON enforcement"
  exit 0
fi

LAST_MSG_FILE="$(mktemp)"
OUTPUT_LAST_FLAG=""
if echo "$CODEX_HELP" | grep -q -- "--output-last-message"; then
  OUTPUT_LAST_FLAG="--output-last-message $LAST_MSG_FILE"
else
  rm -f "$LAST_MSG_FILE"
  write_skip "codex exec lacks --output-last-message; refusing to scrape transcript logs for JSON"
  exit 0
fi

SKIP_GIT_FLAG=""
if echo "$CODEX_HELP" | grep -q -- "--skip-git-repo-check"; then
  SKIP_GIT_FLAG="--skip-git-repo-check"
fi

CD_FLAG=""
if echo "$CODEX_HELP" | grep -q -- "--cd"; then
  CD_FLAG="--cd $PROJECT_ROOT"
fi

USER_BODY="
Inputs:
- Input directory: $INPUT_DIR
- Feature id: $FEATURE_ID
- Spec artifacts: $PROJECT_ROOT/specs/$FEATURE_ID/
- Project root (user's project): $PROJECT_ROOT
- Plugin root (where profiles/<…>.yaml and rules/*.yaml live): $PLUGIN_ROOT

The 'profile' and 'rules' files referenced in the prompt under 'What to read'
live inside the PLUGIN root, not the project root. Use the explicit paths:

- Profile: $PLUGIN_ROOT/profiles/flutter-riverpod-openapi.yaml (or the file referenced by inputs/<feature>/profile.yaml if present in the input directory)
- Rules: $PLUGIN_ROOT/rules/boundary-rules.yaml, $PLUGIN_ROOT/rules/endpoint-rules.yaml, $PLUGIN_ROOT/rules/screen-state-rules.yaml, $PLUGIN_ROOT/rules/security-rules.yaml, $PLUGIN_ROOT/rules/flutter-profile-rules.yaml

The user's project ($PROJECT_ROOT) only contains inputs/ + specs/<feature>/ + reports/ + .archive/. It is normal for profiles/ and rules/ to be absent there. Do NOT flag their absence in the user project as a finding.

Read all the files listed in the prompt under 'What to read', then apply all eight validators in a single pass.

Return ONLY a JSON object that matches the provided schema. Do not include any prose, markdown fences, or commentary outside the JSON.
"

FULL_PROMPT="$(cat "$PROMPT_FILE")

---

$USER_BODY"

set +e
# shellcheck disable=SC2086
codex exec $SANDBOX_FLAG $SKIP_GIT_FLAG $SCHEMA_FLAG $OUTPUT_LAST_FLAG $CD_FLAG "$FULL_PROMPT" >"$LOG_FILE" 2>&1
EXIT=$?
set -e

if [ "$EXIT" -ne 0 ]; then
  write_skip "codex exec failed (exit $EXIT); see $LOG_FILE"
  exit 0
fi

# Extract JSON from last-message file, or fall back to scraping the log.
JSON_BODY=""
if [ -s "$LAST_MSG_FILE" ]; then
  JSON_BODY="$(cat "$LAST_MSG_FILE")"
else
  # META-03: do not scrape transcript logs. Fail closed.
  write_skip "Codex --output-last-message file is empty; refusing to scrape transcript. See $LOG_FILE"
  exit 0
fi

if [ -z "$JSON_BODY" ]; then
  write_skip "Codex returned no JSON; see $LOG_FILE"
  exit 0
fi

# Validate JSON syntax with node (we already depend on it).
if ! printf '%s' "$JSON_BODY" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{JSON.parse(s)}catch(e){process.exit(2)}})" ; then
  cp "$LOG_FILE" "$PROJECT_ROOT/reports/.codex-validate.raw.log"
  write_skip "Codex output was not valid JSON; raw log saved to reports/.codex-validate.raw.log"
  exit 0
fi

# Pretty-print and write canonical JSON.
printf '%s' "$JSON_BODY" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const j=JSON.parse(s);process.stdout.write(JSON.stringify(j,null,2)+'\n')})" > "$OUTPUT_JSON"

# Render a human-readable mirror.
node "$PLUGIN_ROOT/src/llm/render-validation-md.mjs" "$OUTPUT_JSON" > "$OUTPUT_MD" 2>>"$LOG_FILE" || {
  cp "$OUTPUT_JSON" "$OUTPUT_MD"
}

rm -f "$LAST_MSG_FILE"
exit 0
