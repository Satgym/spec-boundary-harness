#!/usr/bin/env bash
# Codex meta-reviewer runner: reviews the harness itself, not a feature spec.
# Read-only; uses the same JSON schema (CodexValidationReport) so the rendered
# Markdown shares a renderer. Output: reports/codex-meta-review.{json,md}.

set -u

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PROMPT_FILE="$ROOT_DIR/prompts/codex-meta-reviewer.md"
SCHEMA_FILE="$ROOT_DIR/schemas/codex-validation-report.schema.json"
OUTPUT_JSON="$ROOT_DIR/reports/codex-meta-review.json"
OUTPUT_MD="$ROOT_DIR/reports/codex-meta-review.md"
LOG_FILE="$ROOT_DIR/reports/.codex-meta-review.log"
mkdir -p "$(dirname "$OUTPUT_JSON")"

write_skip() {
  local reason="$1"
  cat > "$OUTPUT_MD" <<EOF
# Codex Meta Review (harness itself)

Status: SKIPPED

Reason: $reason
EOF
  cat > "$OUTPUT_JSON" <<EOF
{
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "feature_id": null,
  "input_summary": "Meta review was not invoked: $reason",
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

CODEX_HELP="$(codex exec --help 2>/dev/null || true)"

SANDBOX_FLAG=""
if echo "$CODEX_HELP" | grep -q -- "--sandbox"; then
  SANDBOX_FLAG="--sandbox read-only"
else
  write_skip "codex exec does not expose --sandbox; refusing to run without confirmed read-only"
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
Repository root: $ROOT_DIR

Read every file listed in 'What to read' under the prompt, then evaluate the
13 dimensions. Return JSON only, matching the CodexValidationReport schema
that the harness already uses; set validator='other' and feature_id=null for
meta findings.
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

JSON_BODY=""
if [ -s "$LAST_MSG_FILE" ]; then
  JSON_BODY="$(cat "$LAST_MSG_FILE")"
else
  JSON_BODY="$(awk 'BEGIN{depth=0;buf=""} { for(i=1;i<=length($0);i++){c=substr($0,i,1); if(c=="{"){depth++} ; if(depth>0){buf=buf c}; if(c=="}"){depth--; if(depth==0 && length(buf)>2){print buf; buf=""}} } }' "$LOG_FILE" | awk '{ if (length($0) > maxlen) { maxlen=length($0); best=$0 } } END { print best }')"
fi

if [ -z "$JSON_BODY" ]; then
  write_skip "Codex returned no JSON; see $LOG_FILE"
  exit 0
fi

if ! printf '%s' "$JSON_BODY" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{JSON.parse(s)}catch(e){process.exit(2)}})" ; then
  cp "$LOG_FILE" "$ROOT_DIR/reports/.codex-meta-review.raw.log"
  write_skip "Codex output was not valid JSON; raw log saved to reports/.codex-meta-review.raw.log"
  exit 0
fi

printf '%s' "$JSON_BODY" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const j=JSON.parse(s);process.stdout.write(JSON.stringify(j,null,2)+'\n')})" > "$OUTPUT_JSON"

# Reuse the existing renderer but tweak the title.
node "$ROOT_DIR/src/llm/render-validation-md.mjs" "$OUTPUT_JSON" \
  | sed '1s/Codex Validation Report/Codex Meta Review (harness itself)/' \
  > "$OUTPUT_MD" 2>>"$LOG_FILE" || cp "$OUTPUT_JSON" "$OUTPUT_MD"

rm -f "$LAST_MSG_FILE"
exit 0
