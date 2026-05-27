#!/usr/bin/env bash
# spec-harness wrapper.
#
# Purpose: when the harness is installed as a Claude Code plugin, callers may
# not know where the install lives. This wrapper:
#   1. locates the plugin's bin/spec-harness.mjs (multiple fallbacks)
#   2. lazily runs `npm install` whenever package.json changes (hash-gated)
#   3. forwards to the CLI with --root pointing at the user's project
#
# Usage:
#   bash <path-to>/scripts/spec-harness.sh <command> [args...]
#
# Env vars consulted:
#   CLAUDE_PLUGIN_ROOT   set by Claude Code for plugin commands
#   CLAUDE_PROJECT_DIR   set by Claude Code; falls back to $PWD
#
# Exit codes propagate from the underlying CLI.

set -euo pipefail

# ---- locate plugin root --------------------------------------------------

PLUGIN_ROOT=""

# 1) Trust CLAUDE_PLUGIN_ROOT if it points at a real install
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/bin/spec-harness.mjs" ]; then
  PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT}"
fi

# 2) Trust this script's own location (works when invoked by absolute path)
if [ -z "$PLUGIN_ROOT" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [ -f "${SCRIPT_DIR}/../bin/spec-harness.mjs" ]; then
    PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
  fi
fi

# 3) Try common Claude Code marketplace install paths
if [ -z "$PLUGIN_ROOT" ]; then
  for candidate in \
      "$HOME/.claude/plugins/marketplaces/spec-boundary-harness" \
      "$HOME/.claude/plugins"/*/spec-boundary-harness \
      "$HOME/.claude/plugins/marketplaces"/*/spec-boundary-harness \
      "$HOME/.claude/plugins/marketplaces"/*/plugins/spec-boundary-harness \
      "$HOME/.claude/plugins/installed"/*/spec-boundary-harness \
      "$HOME/.claude/plugins/repos"/*/spec-boundary-harness; do
    if [ -e "$candidate/bin/spec-harness.mjs" ]; then
      PLUGIN_ROOT="$candidate"
      break
    fi
  done
fi

# 4) Deep search across the plugins tree (last-resort, bounded depth)
if [ -z "$PLUGIN_ROOT" ] && [ -d "$HOME/.claude/plugins" ]; then
  CANDIDATE="$(find "$HOME/.claude/plugins" -maxdepth 6 -type f -name 'spec-harness.mjs' -path '*/bin/*' 2>/dev/null | head -1)"
  if [ -n "$CANDIDATE" ]; then
    PLUGIN_ROOT="$(cd "$(dirname "$CANDIDATE")/.." && pwd)"
  fi
fi

# 5) Last resort: current working directory (developer checkout)
if [ -z "$PLUGIN_ROOT" ] && [ -f "$(pwd)/bin/spec-harness.mjs" ]; then
  PLUGIN_ROOT="$(pwd)"
fi

if [ -z "$PLUGIN_ROOT" ] || [ ! -f "$PLUGIN_ROOT/bin/spec-harness.mjs" ]; then
  echo "spec-harness: ERROR — cannot locate the plugin install." >&2
  echo "  Looked at:" >&2
  echo "    \$CLAUDE_PLUGIN_ROOT, this script's parent, ~/.claude/plugins/*/spec-boundary-harness, cwd" >&2
  echo "  Install with: /plugin marketplace add Satgym/spec-boundary-harness && /plugin install spec-boundary-harness" >&2
  exit 2
fi

# ---- lazy dependency install (hash-gated) ---------------------------------

hash_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    # extremely unlikely on macOS/Linux/WSL; cheap fallback
    wc -c < "$1"
  fi
}

PKG_FILE="$PLUGIN_ROOT/package.json"
if [ -f "$PKG_FILE" ]; then
  PKG_HASH="$(hash_file "$PKG_FILE")"
  STAMP="$PLUGIN_ROOT/node_modules/.spec-harness-installed"
  INSTALLED_HASH=""
  [ -f "$STAMP" ] && INSTALLED_HASH="$(cat "$STAMP" 2>/dev/null || true)"

  if [ "$PKG_HASH" != "$INSTALLED_HASH" ]; then
    echo "spec-harness: installing dependencies in $PLUGIN_ROOT (first run or package.json changed)..." >&2
    if ! (cd "$PLUGIN_ROOT" && npm install --no-audit --no-fund >&2); then
      echo "spec-harness: npm install failed. Try running it manually: (cd \"$PLUGIN_ROOT\" && npm install)" >&2
      exit 3
    fi
    mkdir -p "$(dirname "$STAMP")"
    echo "$PKG_HASH" > "$STAMP"
  fi
fi

# ---- forward to the CLI ---------------------------------------------------

PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# If the caller didn't pass --root, default to the user's project dir.
HAS_ROOT=0
for arg in "$@"; do
  if [ "$arg" = "--root" ]; then HAS_ROOT=1; break; fi
done

if [ "$HAS_ROOT" -eq 0 ]; then
  exec node "$PLUGIN_ROOT/bin/spec-harness.mjs" "$@" --root "$PROJECT_ROOT"
else
  exec node "$PLUGIN_ROOT/bin/spec-harness.mjs" "$@"
fi
