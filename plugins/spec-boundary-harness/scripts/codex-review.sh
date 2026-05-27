#!/usr/bin/env bash
# Codex external review runner.
# - Read-only: never modifies repository files via Codex.
# - Skips gracefully when codex is unavailable or unsafe flags can't be confirmed.
# - Writes a single report to $SBH_OUTPUT (default reports/codex-review.md).
set -u

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PROMPT_FILE="${PROMPT_FILE:-$ROOT_DIR/prompts/codex-reviewer.md}"
OUTPUT="${SBH_OUTPUT:-$ROOT_DIR/reports/codex-review.md}"
mkdir -p "$(dirname "$OUTPUT")"

write_skip() {
  local reason="$1"
  {
    echo "# Codex Review"
    echo
    echo "Status: SKIPPED"
    echo
    echo "Reason: $reason"
    echo
    echo "_The harness intentionally avoids invoking Codex unless it can confirm a safe read-only sandbox._"
  } > "$OUTPUT"
}

if ! command -v codex >/dev/null 2>&1; then
  write_skip "codex CLI not found on PATH"
  exit 0
fi

if [ ! -f "$PROMPT_FILE" ]; then
  write_skip "Codex reviewer prompt missing at $PROMPT_FILE"
  exit 0
fi

CODEX_HELP="$(codex exec --help 2>/dev/null || true)"

SANDBOX_FLAG=""
if echo "$CODEX_HELP" | grep -q -- "--sandbox"; then
  SANDBOX_FLAG="--sandbox read-only"
elif echo "$CODEX_HELP" | grep -q -- "-s "; then
  SANDBOX_FLAG="-s read-only"
else
  write_skip "Installed codex CLI does not expose a confirmed read-only sandbox flag"
  exit 0
fi

SKIP_GIT_FLAG=""
if echo "$CODEX_HELP" | grep -q -- "--skip-git-repo-check"; then
  SKIP_GIT_FLAG="--skip-git-repo-check"
fi

OUTPUT_LAST_FLAG=""
LAST_MSG_FILE="$(mktemp)"
if echo "$CODEX_HELP" | grep -q -- "--output-last-message"; then
  OUTPUT_LAST_FLAG="--output-last-message $LAST_MSG_FILE"
fi

CD_FLAG=""
if echo "$CODEX_HELP" | grep -q -- "--cd"; then
  CD_FLAG="--cd $ROOT_DIR"
fi

PROMPT="$(cat "$PROMPT_FILE")"

LOG_FILE="$(dirname "$OUTPUT")/.codex-review.log"

set +e
# shellcheck disable=SC2086
codex exec $SANDBOX_FLAG $SKIP_GIT_FLAG $OUTPUT_LAST_FLAG $CD_FLAG "$PROMPT" >"$LOG_FILE" 2>&1
EXIT=$?
set -e

if [ "$EXIT" -ne 0 ]; then
  {
    echo "# Codex Review"
    echo
    echo "Status: FAILED (exit $EXIT)"
    echo
    echo "Log tail:"
    echo
    echo '```'
    tail -n 80 "$LOG_FILE"
    echo '```'
  } > "$OUTPUT"
  exit 0
fi

if [ -s "$LAST_MSG_FILE" ]; then
  {
    echo "# Codex Review"
    echo
    cat "$LAST_MSG_FILE"
  } > "$OUTPUT"
else
  {
    echo "# Codex Review"
    echo
    echo "_Codex returned no last-message file; full transcript follows._"
    echo
    echo '```'
    cat "$LOG_FILE"
    echo '```'
  } > "$OUTPUT"
fi

rm -f "$LAST_MSG_FILE"
exit 0
