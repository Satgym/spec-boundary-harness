# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.2] — 2026-05-27

### Fixed
- Plugin `source` in `marketplace.json` is now `{"source": "git", "url": "https://github.com/Satgym/spec-boundary-harness.git"}`. The previous `"source": "github"` form caused Claude Code to attempt an SSH clone (`git@github.com:...`), which fails on machines that have not yet accepted GitHub's SSH host key (`No ED25519 host key is known for github.com`). The explicit HTTPS URL bypasses SSH entirely.

### Notes
- If you previously hit either of these install errors, run `Manage Plugins → Marketplaces → spec-boundary-harness → Update` (or the equivalent CLI command in a Claude Code session that supports `/plugin`), then `Install` again. The slash command `/plugin` itself is only available in certain Claude Code environments (the desktop app and recent CLIs); the **Manage Plugins** GUI works everywhere it's exposed.

## [0.3.1] — 2026-05-27

### Fixed
- `marketplace.json` plugin `source` switched from the path form (`"."`) to the explicit GitHub object form (`{"source": "github", "repo": "Satgym/spec-boundary-harness"}`). The path form is only recognised by recent Claude Code builds; the GitHub form is supported across a wider range of versions. Resolves "This plugin uses a source type your Claude Code version does not support."
- Removed unverified `$schema` URLs from `marketplace.json` and `plugin.json` (the JSON Schema Store entries we referenced may not exist, which can cause strict parsers to reject the file).

### Notes
- If installation still fails after `/plugin marketplace update Satgym/spec-boundary-harness`, update Claude Code itself (the error message recommends this) or fall back to the manual install instructions in README.md.

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
