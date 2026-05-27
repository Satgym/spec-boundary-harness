# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] — 2026-05-28

Discovered during autonomous round 1 of the autorun improvement loop. Two critical bugs that broke `validate` when the plugin was actually installed (vs cloned in dev). Both already fixed in code; the loop continues.

### Fixed

- **`scripts/codex-validate.sh` and `src/cli/validate.ts`**: `ROOT_DIR` was being used for both the plugin install location (where prompts/schemas live) and the user project (where reports/specs live). When the harness is installed as a Claude Code plugin and called from a user project, the script could not find its own prompt/schema files. Split into `PLUGIN_ROOT` (script's parent) and `PROJECT_ROOT` (`$ROOT_DIR`, the user's project).
- **`scripts/codex-validate.sh`**: When Codex was launched with `--cd $PROJECT_ROOT`, the validator prompt's references to `profiles/<…>.yaml` and `rules/*.yaml` resolved against the user project — which doesn't contain those files. The Codex validator now receives the explicit `$PLUGIN_ROOT` path in the user body and is told that `profiles/` and `rules/` live there, with a note that absence from the user project is normal.

### Notes

Both bugs were undiscovered because the harness was previously only exercised from inside the marketplace repo itself, where the two locations happen to coincide. The autorun loop in `/tmp/sbh-autorun-1/` exposed them on the first real Codex call.

## [0.6.0] — 2026-05-27

Cross-section consistency hardening, based on integration-failure feedback from the `sbh-test` reservation-modify run. Two P0 defects (M1, M2) and three P1/P2 weaknesses identified by an isolated-FE-vs-isolated-BE round-trip test are now closed. See `HARNESS_FIX_PROMPT.md` in the upstream repo for the full root-cause writeup.

### Fixed — M1 (response-field cross-section mismatch)

When the same endpoint's response is described both in narrative form (e.g. "변경 성공 응답 — id, name, ...") and via schema reference (OpenAPI patch, GET response equivalence), the two descriptions could silently disagree. FE and BE developers each follow the section they read, and integration breaks (e.g. FE expects three UX-hint fields the BE never returns).

- `prompts/claude-finalizer.md` now runs `[CHECK: response-field-consistency]` before writing the Korean hand-off documents. The check builds `fields_narrative` and `fields_api` for every endpoint that appears in both forms and refuses to proceed when they diverge without an explicit relationship sentence.
- `prompts/codex-validator.md` adds rule **9. `cross-section-consistency`** as a regression net: any silent divergence between narrative and schema response-field sets is reported as `high`.

### Fixed — M2 (error enum × screen-state enum coverage gap)

When an endpoint's error enum included a code (e.g. `STALE_RESERVATION_VERSION`) that had no entry in the calling screen's state enum (e.g. cancel-modal had 9 states but not `stale_version`), the gap was invisible because the two enums were described in different sections. FE quietly fell back to `server_error`; BE never knew.

- `prompts/claude-analyzer.md` now executes `[STEP 8: error-x-screen-state-mapping]`. For every endpoint, it builds an explicit `endpoint × error → state` matrix into `04-screen-state-spec.md`. Empty cells are never accepted: the analyzer must either extend the state enum, pick a named fallback, or register a `question` in `02-conflicts-and-questions.md`.
- `prompts/claude-finalizer.md` adds `[CHECK: error-enum-x-screen-state-coverage]` to refuse Korean-doc generation while any cell is empty or maps to a state that does not exist on the calling screen.
- `prompts/codex-validator.md`'s `screen-state-coverage` rule now flags the cross-enum gap at `high` severity.
- `rules/screen-state-rules.yaml` formalises the rule as `error-state-coverage` with explicit enforcement points at analyzer / finalizer / validator.

### Added — `[PREFLIGHT: prd-self-consistency]`

PRDs often contain their own contradictions (same domain fact stated two different ways in two different sections, error semantics defined in one place and screen states defined in another with no cross-check). The analyzer now performs a self-consistency scan over the PRD **before** producing any artifact. Mismatches register as conflicts in `02-conflicts-and-questions.md`, even if the PRD's own "Open Questions" section did not mention them.

### Added — `[FINAL CHECK: round-trip simulation]`

`prompts/claude-finalizer.md` now simulates two isolated developer sessions before publishing the Korean hand-off docs:

- `A_fe` = what an FE developer who reads only `01-공통-규칙.md` + `02-프론트엔드-작업.md` would assume about endpoint path/method, request/response field sets, error→HTTP mapping, auth, serialization metadata.
- `A_be` = the corresponding contract a BE developer who reads only `01-공통-규칙.md` + `03-백엔드-작업.md` would conclude.

When `A_fe ≠ A_be` on any axis, the finalizer rewrites the relevant section of `01-공통-규칙.md` until the two sides agree.

### Added — serialization metadata is now mandatory

`01-공통-규칙.md` must contain an explicit "직렬화 메타데이터" section covering JSON key case, timestamp format, version/ID numeric types, and list-response wrapper shape. Missing values get a documented default and a registered question, never silent assumptions.

Enforced through:

- `prompts/claude-analyzer.md` `[STEP 9: serialization-metadata]`
- `prompts/claude-finalizer.md` `[CHECK: serialization-metadata-present]`
- `rules/screen-state-rules.yaml` `serialization-metadata-required`

### Regression test scenario

`/Users/satgym/work/sbh-test/inputs/test/` (the original reservation-modify reproduction case) should be re-run after this version is installed. The two regression assertions are:

- `01-공통-규칙.md` §2.8 "변경 성공 응답" field set agrees with §6.2 PATCH response field set (or the difference is explicit).
- `02-프론트엔드-작업.md` cancel-modal state enum covers every error returned by the cancel endpoint, including `STALE_RESERVATION_VERSION`.

## [0.5.1] — 2026-05-27

### Added — `/spec-boundary-harness:setup <feature-id>` slash command

Bootstraps a new feature bundle in the user's current project. Creates:

```
inputs/<feature-id>/
└── prd/
    └── 기획서.md         ← Korean PRD template with 8 sections
```

After running, the user fills in the PRD and drops free-form notes (transcripts, summaries, API drafts, design notes) loose under the same bundle directory, then runs `/spec-boundary-harness:spec-harness`.

Notes:
- Feature ids are normalized to dotted form (`auth-login` → `auth.login`).
- If `기획서.md` already exists, the command leaves it untouched and reports.
- The PRD template is intentionally minimal — 8 labelled sections in Korean, no placeholder bullets that the user has to remember to clear.

Also exposed as a CLI subcommand: `spec-harness setup <feature-id>`.

4 new vitest cases for the setup command (37/37 pass total).

## [0.5.0] — 2026-05-27

User-facing redesign based on four feedback items: simpler input layout, Korean output, smaller result surface, stricter reviewer.

### Changed — input layout

`inputs/<feature>/` is now **PRD-only required**, everything else is free-form. The four-folder convention (`prd/`, `plaud/`, `endpoints/`, `design/`) is no longer expected:

```
inputs/<feature-id>/
├── prd/                  ← REQUIRED. Non-negotiable spec.
│   └── *.md
├── *.md / */             ← FREE-FORM. Name and arrange however you like.
└── profile.yaml          ← OPTIONAL.
```

Claude classifies each file by content (PRD-level / summary / endpoint notes / transcript / design), so users don't have to think about which folder a file belongs to.

`detect.ts` was tightened to require a non-empty `prd/` directory. Legacy bundles with `plaud/`/`endpoints/`/`design/` markers still detect for backward compatibility.

### Changed — result surface

The user now sees only **three Korean hand-off documents** at `results/<feature-id>/`, written by the finalizer after Codex review:

- `01-공통-규칙.md` — shared rules: feature summary, decisions, conflicts/security, API contract summary in prose, HTTP-code↔UI-state mapping, integration checklist, L0–L4 responsibility split
- `02-프론트엔드-작업.md` — frontend developer's task brief
- `03-백엔드-작업.md` — backend developer's task brief

All three are in **Korean** and self-contained: a developer can paste any one as the entire context for their own Claude Code session and start working.

The 11 intermediate artifacts under `specs/<feature>/` and the supporting reports under `reports/` are **auto-archived** to `.archive/<feature-id>-<timestamp>/` after the pipeline completes. The user's project surface stays minimal.

### Changed — reviewer severity policy

`codex-validator.md` now instructs Codex to report **only `critical` and `high`-severity findings**. The following are explicitly out of scope and will not be reported:

- Source-ref line-precision corrections
- Terminology and naming consistency
- Stylistic / "would be nicer to" suggestions
- Wording or grammar polish

The reviewer focuses on contract integrity and boundary integrity. The triage loop converges faster as a result.

### Process

- Phase 1 (analyzer) still writes 11 intermediate artifacts; they're internal now.
- Phase 2 (Codex validator) returns only critical/high.
- Phase 3 (finalizer) writes the 3 Korean documents and auto-archives intermediates.

### Notes for upgraders

- Existing samples (`examples/auth-login`, `examples/review.create`) keep their 4-folder layout (backward compat). New work should use the simpler layout.
- After running spec-harness, expect `results/<feature>/` + `.archive/<feature>-<ts>/` instead of `specs/<feature>/` + `reports/` at the project surface.

## [0.4.0] — 2026-05-27

Restructure the repo into the standard Claude Code marketplace layout: `plugins/<name>/` subdirectory + path-form `source`. This is the most portable form across Claude Code versions and avoids SSH cloning entirely.

### Why
- `"."` (0.3.0/0.3.3) — "source type your Claude Code version does not support"
- `{"source": "github", "repo": ...}` (0.3.1, 0.3.4) — accepted by the manifest parser **but Claude Code clones with SSH** (`git@github.com:...`); fails for users without a GitHub SSH key (`Permission denied (publickey)`)
- `{"source": "git", "url": "https://..."}` (0.3.2) — "source type your Claude Code version does not support"

The remaining standard form is a **relative path source**, which requires the plugin files to live in a subdirectory of the marketplace. That is what this release does.

### Changed
- All plugin assets moved into `plugins/spec-boundary-harness/`:
  - `.claude/`, `commands/`, `skills/`, `agents/`, `bin/`, `src/`, `scripts/`, `prompts/`, `rules/`, `profiles/`, `schemas/`, `tests/`, `examples/`, `evals/`, `docs/`, `specs/`, `reports/`, `package.json`, `tsconfig.json`, `vitest.config.ts`, `ASSUMPTIONS.md`, `CLAUDE.md`
  - `.claude-plugin/plugin.json` → `plugins/spec-boundary-harness/.claude-plugin/plugin.json`
- `marketplace.json` plugin `source` is now `"./plugins/spec-boundary-harness"` (path form).
- Sample input bundle `inputs/review.create/` → `plugins/spec-boundary-harness/examples/review.create/`.

### Unchanged
- The wrapper script (`scripts/spec-harness.sh`) already had `marketplaces/*/plugins/spec-boundary-harness` in its candidate path list from v0.3.3, so it picks up the new layout without modification.
- Slash command and skill inline lookup snippets use the same candidate list.
- `--root` still defaults to `$CLAUDE_PROJECT_DIR` or `$PWD`, so user-project artifacts go to the user's project, not into the plugin install.

### Install / re-install

Users who hit the SSH or source-type errors on 0.3.x should:

1. **Manage Plugins → Marketplaces** → remove the existing `spec-boundary-harness` row.
2. Re-add `https://github.com/Satgym/spec-boundary-harness.git`.
3. **Plugins** tab → **Install**.

No SSH key, no `ssh-keyscan`, no `--output-schema` quirks — the marketplace is fetched over HTTPS (already true since 0.3.x) and the plugin is now a relative path inside that same fetched repo, so no second clone is attempted.

## [0.3.4] — 2026-05-27

Revert the plugin `source` form to the `github` shorthand. Users on otherwise-up-to-date Claude Code builds reported the `{"source": "git", "url": "..."}` form (introduced in 0.3.2) as **"This plugin uses a source type your Claude Code version does not support."** The `github` shorthand was the only form known to be recognised across all the builds we tested.

### Changed
- `marketplace.json` plugin source is now:
  ```json
  "source": { "source": "github", "repo": "Satgym/spec-boundary-harness" }
  ```
  This was last used in 0.3.1, where it produced an SSH host-key error rather than a source-type error. The host-key issue is environmental and fixed with a one-liner (`ssh-keyscan -t ed25519,rsa github.com >> ~/.ssh/known_hosts`); the source-type issue is structural and cannot be worked around.

### Fix sequence users may need to run once

1. (In any shell)
   ```bash
   ssh-keyscan -t ed25519,rsa github.com >> ~/.ssh/known_hosts
   ```
2. **Manage Plugins → Marketplaces** → remove the existing `spec-boundary-harness` marketplace (GUI cache may otherwise hold an old manifest) → re-add `https://github.com/Satgym/spec-boundary-harness.git`.
3. **Manage Plugins → Plugins** → Install.

### If this still fails

The next escalation is to move plugin files into a `plugins/spec-boundary-harness/` subdirectory and switch the marketplace source to a path form (`"./plugins/spec-boundary-harness"`). Tracked separately if it becomes necessary.

## [0.3.3] — 2026-05-27

Pre-flight pass aimed at making the **Manage Plugins GUI flow** (Add Marketplace via GitHub URL → Install) work reliably across Claude Code versions.

### Added
- `commands/`, `skills/`, `agents/` at the **plugin root** — Claude Code's plugin loader looks for these standard names by default. Previously the files lived only under `.claude/commands/` (project-local convention), which may not be discovered when the repo is installed as a plugin.
- `scripts/sync-plugin-locations.sh` keeps `.claude/` (source of truth, used for project-local development) and the root-level `commands/skills/agents` (used by the plugin loader) identical. Run it before committing any change to `.claude/`.

### Fixed
- Wrapper script (`scripts/spec-harness.sh`) plugin-root detection now covers more install paths (`marketplaces/<name>`, `marketplaces/<name>/plugins/<name>`, `installed/<name>/<name>`, `repos/<name>/<name>`) and falls back to a bounded `find` across `~/.claude/plugins/` for unusual layouts.
- Slash command and skill inline lookup snippets mirror the same path list, so Claude can locate the wrapper regardless of which Claude Code build it's running under.

### Notes
- The plugin source in `marketplace.json` remains the explicit HTTPS `git` form from 0.3.2 (no SSH, no `github` shorthand) — this part has not changed and is the one that fixed the host-key clone error.

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
