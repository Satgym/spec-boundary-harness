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

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
INPUT_DIR="${1:?usage: $0 <inputDir> <featureId>}"
FEATURE_ID="${2:?usage: $0 <inputDir> <featureId>}"

PROMPT_FILE="$ROOT_DIR/prompts/codex-validator.md"
SCHEMA_FILE="$ROOT_DIR/schemas/codex-validation-report.schema.json"
OUTPUT_JSON="$ROOT_DIR/reports/codex-validation-report.json"
OUTPUT_MD="$ROOT_DIR/reports/codex-validation-report.md"
LOG_FILE="$ROOT_DIR/reports/.codex-validate.log"
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
if [ ! -d "$ROOT_DIR/specs/$FEATURE_ID" ]; then
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

SCHEMA_FLAG=""
if echo "$CODEX_HELP" | grep -q -- "--output-schema"; then
  SCHEMA_FLAG="--output-schema $SCHEMA_FILE"
fi

SKIP_GIT_FLAG=""
if echo "$CODEX_HELP" | grep -q -- "--skip-git-repo-check"; then
  SKIP_GIT_FLAG="--skip-git-repo-check"
fi

LAST_MSG_FILE="$(mktemp)"
OUTPUT_LAST_FLAG=""
if echo "$CODEX_HELP" | grep -q -- "--output-last-message"; then
  OUTPUT_LAST_FLAG="--output-last-message $LAST_MSG_FILE"
fi

CD_FLAG=""
if echo "$CODEX_HELP" | grep -q -- "--cd"; then
  CD_FLAG="--cd $ROOT_DIR"
fi

USER_BODY="
Inputs:
- Input directory: $INPUT_DIR
- Feature id: $FEATURE_ID
- Spec artifacts: $ROOT_DIR/specs/$FEATURE_ID/

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
  # Best-effort scrape: find the largest JSON object in the log.
  JSON_BODY="$(awk 'BEGIN{depth=0;buf=""} { for(i=1;i<=length($0);i++){c=substr($0,i,1); if(c=="{"){depth++} ; if(depth>0){buf=buf c}; if(c=="}"){depth--; if(depth==0 && length(buf)>2){print buf; buf=""}} } }' "$LOG_FILE" | awk '{ if (length($0) > maxlen) { maxlen=length($0); best=$0 } } END { print best }')"
fi

if [ -z "$JSON_BODY" ]; then
  write_skip "Codex returned no JSON; see $LOG_FILE"
  exit 0
fi

# Validate JSON syntax with node (we already depend on it).
if ! printf '%s' "$JSON_BODY" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{JSON.parse(s)}catch(e){process.exit(2)}})" ; then
  cp "$LOG_FILE" "$ROOT_DIR/reports/.codex-validate.raw.log"
  write_skip "Codex output was not valid JSON; raw log saved to reports/.codex-validate.raw.log"
  exit 0
fi

# Pretty-print and write canonical JSON.
printf '%s' "$JSON_BODY" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const j=JSON.parse(s);process.stdout.write(JSON.stringify(j,null,2)+'\n')})" > "$OUTPUT_JSON"

# Render a human-readable mirror.
node "$ROOT_DIR/src/llm/render-validation-md.mjs" "$OUTPUT_JSON" > "$OUTPUT_MD" 2>>"$LOG_FILE" || {
  cp "$OUTPUT_JSON" "$OUTPUT_MD"
}

rm -f "$LAST_MSG_FILE"
exit 0
