# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] — 2026-05-27

First release packaged as a Claude Code plugin / marketplace.

### Added
- `.claude-plugin/marketplace.json` — registers this repo as a Claude Code marketplace.
- `.claude-plugin/plugin.json` — declares the `spec-boundary-harness` plugin.
- `scripts/spec-harness.sh` — wrapper that locates the plugin install, lazily runs `npm install` (hash-gated against `package.json`), and forwards to the CLI with `--root` set to the user's project directory.
- Slash command (`/spec-harness`) and skill (`.claude/skills/spec-harness/SKILL.md`) now locate the wrapper via `$CLAUDE_PLUGIN_ROOT` with multiple fallbacks, so the same source works whether the user installed the plugin or cloned the repo.
- `CHANGELOG.md`.

### Install / update
- Install: `/plugin marketplace add Satgym/spec-boundary-harness` then `/plugin install spec-boundary-harness`.
- Update: `/plugin marketplace update Satgym/spec-boundary-harness` followed by `/plugin install spec-boundary-harness` (re-install picks up the new version).

### Notes
- The wrapper uses a hash of `package.json` stored at `node_modules/.spec-harness-installed` to skip re-installing on every invocation. A version bump that changes dependencies triggers exactly one `npm install`.
- Codex CLI remains required for the Phase 2 read-only validator. Without it, Phase 1 still runs but the harness writes a SKIPPED report and `validate` returns non-zero (no fail-open).

## [0.2.0] — 2026-05-27

LLM-driven rebuild. Replaced regex/keyword analyzer and validator with two LLM passes (Claude for analysis/finalization, Codex for read-only validation), keeping deterministic checks only where they catch errors LLMs cannot.

### Added
- `prompts/claude-analyzer.md`, `prompts/codex-validator.md`, `prompts/claude-finalizer.md`.
- `schemas/codex-validation-report.schema.json` enforced via `codex --output-schema`.
- `scripts/codex-validate.sh` (fail-closed if `--output-schema` / `--output-last-message` are unavailable).
- `prompts/codex-meta-reviewer.md` + `scripts/codex-meta-review.sh` for reviewing the harness itself.
- Zod schemas mirror the JSON Schema (`.strict()` + nullable required + ISO 8601 refine on `generated_at`).
- `inputs/` convention with auto-detection (rejects empty bundles, requires real content files).
- `examples/auth-login` and `inputs/review.create` end-to-end samples.
- Vitest suite (31 tests): schema parity, preflight, auto-detection, ISO 8601, malformed YAML.

### Fixed
- Validator now treats `Codex SKIPPED` as a validation failure (no fail-open).
- High-severity security warnings (not only conflicts) block packet `Status: READY`.
- Source-ref doc ids checked against the actual source index.
- README quickstart uses explicit `<INPUT_DIR> <FEATURE_ID>` so multi-bundle repos are unambiguous.
- `detectInputs` rejects directories that have a marker subfolder but no readable content files.

### Removed
- Regex/keyword analyzer, boundary classifier, emitter, and validator code from v0.1.0.

## [0.1.0] — 2026-05-26

Initial proof of concept with regex/keyword analyzer, hardcoded feature matchers, and deterministic validators. Codex was used as an adversarial reviewer but not as the primary validator. Superseded by 0.2.0.
