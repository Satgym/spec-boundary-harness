# Codex Meta Review (harness itself)

Generated: 2026-05-27T11:53:43+09:00
Feature: (unspecified)

## Input summary

Read the requested repository docs, Claude/Codex prompts, schema, CLI and validation code, Codex wrapper, rules/profile files, tests, review.create inputs, generated specs, and reports. The current repo already has several strong guardrails, including strict required nullable JSON fields, additionalProperties=false, Codex skip detection in validateCommand, and no remaining awk log-scrape fallback, but there are still concrete gaps in orchestration, deterministic preflight depth, example source precision, and public-release robustness.

## Findings

Counts: critical=0, high=0, medium=8, low=3

### META-01 — [medium] other (.claude/commands/spec-harness.md)

- Message: The Phase 3 rerun drops the resolved inputDir/featureId even though Phase 2 explicitly says to pass them. In repos with multiple bundles, the triage loop can fail auto-detection instead of validating the just-fixed feature.
- Evidence: .claude/commands/spec-harness.md:46-49 says to run validate with explicit INPUT_DIR and FEATURE_ID, but .claude/commands/spec-harness.md:66 reruns `node ./bin/spec-harness.mjs validate`; .claude/skills/spec-harness/SKILL.md:66-70 vs :96 has the same mismatch.
- Suggested fix: Change every triage-loop rerun to `node ./bin/spec-harness.mjs validate <INPUT_DIR> <FEATURE_ID>` and keep those variables explicit through the finalizer instructions.

### META-02 — [medium] other (src/validate/zod-only.ts)

- Message: The deterministic preflight can pass artifacts that are syntactically present but unusable downstream. This is documented as a narrow check, but it is too weak to serve as a practical safety net when Codex is unavailable or misses a structural issue.
- Evidence: src/validate/zod-only.ts:31-37 only reads each expected file and YAML.parses `.yaml` files; tests/zod-only-validators.test.ts:22-45 expects success for stubs such as `layers: []`, `paths: {}`, and markdown files containing only `# x`.
- Suggested fix: Add lightweight structural schemas for the artifact skeletons: feature_id matches, required markdown headings exist, requirements is an array, boundary layers include L0-L4, OpenAPI has top-level paths, and packets contain Status/Allowed files/Forbidden files sections.

### META-03 — [medium] other (src/cli/detect.ts)

- Message: Input bundle detection treats an empty directory with a recognized subdirectory as a valid candidate. That can let `/spec-harness` proceed on a bundle with no PRD, transcript, endpoint note, design note, or profile content.
- Evidence: src/cli/detect.ts:17-27 returns true when `prd`, `plaud`, `endpoints`, `design`, or `profile.yaml` merely exists; .claude/skills/spec-harness/SKILL.md:127-130 says to stop when the input directory is empty or has no recognizable materials.
- Suggested fix: Require at least one readable `.md`, `.txt`, `.yaml`, or `.yml` file under recognized input locations, and report empty candidates distinctly from valid bundles.

### META-04 — [medium] other (README.md)

- Message: The no-argument quickstart is inaccurate for the repository as checked in. A clean clone contains both `inputs/review.create` and `examples/auth-login`, while the docs imply `/spec-harness` can auto-select the bundled auth.login sample.
- Evidence: README.md:26 says the skill auto-detects an input bundle; README.md:57-60 says to try the bundled sample with `detect` then `/spec-harness`; src/cli/detect.ts:15 searches both `inputs` and `examples`; inputs/review.create/profile.yaml:1 and examples/auth-login/profile.yaml:1 are both valid candidates.
- Suggested fix: Update the quickstart to pass an explicit bundle, for example `/spec-harness examples/auth-login auth.login`, or move exercised sample inputs out of `inputs/` before public release.

### META-05 — [medium] other (specs/review.create/08-frontend-claude-packet.md)

- Message: The profile and generated frontend packet mix read-only design-system dependencies into the allowed file write scope. The packet later forbids design-system modification, but downstream agents may reasonably interpret `Allowed files` as editable scope.
- Evidence: inputs/review.create/profile.yaml:7-14 lists `lib/core/design_system/**` under `frontend_allowed_files` with the comment `사용만; 본 feature에서 수정 금지`; specs/review.create/08-frontend-claude-packet.md:34-42 repeats it under `Allowed files`, while :29 and :79 say not to modify it.
- Suggested fix: Split profile and packet scope into `allowed_write_files` and `read_only_dependency_files`, then remove `lib/core/design_system/**` from frontend writable scope for this feature.

### META-06 — [medium] other (scripts/codex-validate.sh)

- Message: The Codex wrapper builds CLI flags as unquoted strings and writes skip JSON by raw heredoc interpolation. Paths or feature IDs containing spaces, quotes, backslashes, or newlines can split arguments or produce invalid JSON.
- Evidence: scripts/codex-validate.sh:83-99 stores flags like `--output-schema $SCHEMA_FILE`; scripts/codex-validate.sh:128-130 disables SC2086 and expands those strings into `codex exec`; scripts/codex-validate.sh:38-45 interpolates `$FEATURE_ID` and `$reason` directly into JSON.
- Suggested fix: Build the Codex command with a Bash argv array and generate skip JSON through Node `JSON.stringify` instead of heredoc string interpolation.

### META-07 — [low] other (src/cli/validate.ts)

- Message: The preflight markdown can say Codex was invoked even when the wrapper only wrote a skipped report. The returned ValidateResult corrects this later, but the human-facing preflight report is misleading.
- Evidence: src/cli/validate.ts:51 sets `codexInvoked = codex === 0`; scripts/codex-validate.sh:49-68 writes skipped reports and exits 0 for unavailable inputs/tools; src/cli/validate.ts:90 writes `Codex invoked: ${codexInvoked}` before using `codexSkipped` in the final ok calculation at :99.
- Suggested fix: Write `Codex invoked: ${codexInvoked && !codexSkipped}` or add separate fields for wrapper exit, skipped status, and effective validator execution.

### META-08 — [medium] other (tests/zod-only-validators.test.ts)

- Message: The YAML parse regression test does not assert that malformed YAML is reported. As written, it passes even if zero unparseable files are detected.
- Evidence: tests/zod-only-validators.test.ts:46 names the case `reports unparseable YAML`, but tests/zod-only-validators.test.ts:68-70 asserts `r.unparseable.length` is greater than or equal to 0, which is always true.
- Suggested fix: Use a YAML string known to throw with the chosen parser and assert `r.unparseable.length > 0` plus the offending file path.

### META-09 — [low] other (schemas/codex-validation-report.schema.json)

- Message: The report schema enforces strict object shape, but it does not enforce the promised ISO 8601 timestamp. A non-date string for `generated_at` is schema-valid and Zod-valid.
- Evidence: schemas/codex-validation-report.schema.json:8 defines `generated_at` as only `{ "type": "string" }`; src/schemas/index.ts:42 also uses `z.string()`.
- Suggested fix: If supported by the Codex schema path, add `format: date-time`; otherwise add a post-parse Zod refinement or deterministic date validation in `checkCodexReport`.

### META-10 — [medium] other (specs/review.create/05-domain-model.yaml)

- Message: The latest example still has an incomplete source_ref for the ReviewError enum. Several enum values are sourced from endpoint lines that are not included in the cited span, so the final no-findings report missed at least one source precision issue.
- Evidence: specs/review.create/05-domain-model.yaml:25-30 lists `unauthenticated`, `not_a_purchaser`, `duplicate_review`, and `server_error`, but cites endpoints/api-notes.md:28-33; the corresponding endpoint errors are on inputs/review.create/endpoints/api-notes.md:34-37.
- Suggested fix: Change the ReviewError source_ref to cover endpoints/api-notes.md:31-37, or split refs by error code so each enum value is line-grounded.

### META-11 — [low] other (prompts/claude-analyzer.md)

- Message: The analyzer prompt assigns ownership of `11-validation-summary.md` to the Codex validator, while the rest of the harness makes Claude finalizer own it. This is a small prompt inconsistency that can confuse a fresh session.
- Evidence: prompts/claude-analyzer.md:324-331 says `Codex validator populates it later via the harness`; prompts/claude-finalizer.md:66-83 instructs Claude to overwrite `specs/<feature-id>/11-validation-summary.md`.
- Suggested fix: Change the analyzer wording to say the file is a placeholder that the Claude finalizer overwrites after reading the Codex report.

## Notes

Systemic risks to call out before public release: Codex outage/auth/flag mismatch now fails closed, which is safer but removes the independent review guarantee; low-trust transcript-heavy bundles still depend heavily on LLM judgment; multi-feature material in one folder is only handled by prompt instruction, not deterministic splitting; Korean/English prompt-injection coverage exists in the prompt but lacks regression tests; manual edits under specs/ can bypass provenance unless validation is rerun; cost and latency grow with full-file rereads. Marketplace readiness would benefit from a plugin/marketplace manifest, CI, golden fixture tests, a documented compatibility matrix for Codex CLI flags, and deterministic tests for detect/validate/script behavior.
