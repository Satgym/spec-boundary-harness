#!/usr/bin/env bash
# Sync .claude/ (project-local convention) → commands/, skills/, agents/
# (Claude Code plugin standard locations).
#
# Source of truth is .claude/. The top-level directories are checked-in
# copies that exist so plugin installs find commands/skills/agents at the
# layout Claude Code's plugin loader expects.
#
# Run this before committing any change to .claude/.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -d ".claude" ]; then
  echo "sync-plugin-locations: .claude/ not found in $ROOT_DIR" >&2
  exit 1
fi

for sub in commands skills agents; do
  if [ -d ".claude/$sub" ]; then
    rm -rf "$sub"
    cp -R ".claude/$sub" "$sub"
    echo "synced .claude/$sub → $sub"
  fi
done

echo "done."
