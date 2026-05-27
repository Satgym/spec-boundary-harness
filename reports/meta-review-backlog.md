# Meta-Review Backlog

Tracks medium / low findings from the Codex meta-review that were **not** auto-applied in this session and are queued for future iterations.

Status legend:
- `accepted, applied` — fix landed in this commit
- `accepted, deferred` — agreed real issue, scheduled for follow-up
- `rejected` — finding declined with reason

## Round 1 (10 findings) → Round 2 (11 findings) → Round 3 (11 findings)

Critical/high progression: **1 critical + 4 high → 0 critical + 1 high → 0 critical + 0 high**. All blocking-severity items have been addressed in code.

## Accepted and applied

| id (latest round) | severity | summary | landed in |
|---|---|---|---|
| META-01 (round 1, critical) | critical | Codex SKIPPED produced ok=true | `src/cli/validate.ts` — skip detection + ok=false on skip |
| META-02 (round 1, high) | high | Zod schema looser than JSON Schema | `src/schemas/index.ts` — `.strict()` + nullable required |
| META-03 (round 1, high) | high | `codex-validate.sh` fallback log scrape | `scripts/codex-validate.sh` — require `--output-schema` + `--output-last-message`, fail closed |
| META-05 (round 1, high) | high | High-severity security warning didn't block packet | `prompts/codex-validator.md` + `specs/review.create/{08,09}-…packet.md` (BLOCKED) |
| META-06 (round 1+2, high) | high | source_refs precision in review.create | `specs/review.create/{01,02,03,05,07}-….yaml/md` |
| META-01 (round 3, medium) | medium | Triage rerun lacked explicit args | `.claude/commands/spec-harness.md`, `.claude/skills/spec-harness/SKILL.md` |
| META-03 (round 3, medium) | medium | `detectInputs` accepted empty bundles | `src/cli/detect.ts` — `hasReadableContent` guard + test |
| META-04 (round 3, medium) | medium | README quickstart inaccurate (multi-bundle) | `README.md` — explicit `/spec-harness examples/auth-login auth.login` |
| META-04 (round 2, medium) | medium | rules YAML claimed deterministic enforcement | `rules/boundary-rules.yaml` — docstring corrected |
| META-07 (round 3, low) | low | preflight md mislabeled `codexInvoked` | `src/cli/validate.ts` — separate "wrapper exited 0" and "actually ran" fields |
| META-08 (round 3, medium) | medium | YAML unparseable test was a tautology | `tests/zod-only-validators.test.ts` — assertion strengthened |
| META-09 (round 3, low) | low | `generated_at` was any string | `src/schemas/index.ts` — `Date.parse` refine + tests |
| META-10 (round 3, medium) | medium | `05-domain-model.yaml` ReviewError source_ref | `specs/review.create/05-domain-model.yaml` |
| META-07 (round 1, low) | low | triage report contradicted packet status (READY vs BLOCKED) | `reports/codex-triage.md` |
| META-10 (round 2, low) | low | validator prompt said "notes" was optional | `prompts/codex-validator.md` |
| META-02 (round 2, medium) | medium | validator prompt omitted `11-validation-summary.md` from read list | `prompts/codex-validator.md` |

## Accepted and deferred (backlog)

These findings are real and accepted, but the safe fix is larger than a session-end change. Each one has a "what to do" sketch.

### META-02 (round 3, medium) — preflight depth

> The deterministic preflight can pass artifacts that are syntactically present but unusable downstream.

What to do:
- Add `zod-skeleton.ts` with shape-only schemas for each of the 11 artifacts (top-level keys, expected sections).
- `01-requirements.yaml` must have `feature`, `title`, `requirements` (array); each requirement must have id/text/category.
- `03-boundary-map.yaml` must list all of L0..L4 once.
- `06-openapi.patch.yaml` must have `paths` non-empty.
- `08-frontend-claude-packet.md` / `09-backend-claude-packet.md` must contain "Status:" line and "Allowed scope" / "Forbidden scope" / "Allowed files" sections.
- Add tests that confirm an artifact with only `# x` is rejected.

Estimated effort: 2-3 hours.

### META-05 (round 2+3, medium) — readonly vs writable scope

> The frontend packet conflates "may import" and "may modify" file globs.

What to do:
- Extend `ProjectProfileSchema` with `frontend_readonly_files` (imports allowed, edits forbidden).
- Move `lib/core/design_system/**` and similar shared libraries from `frontend_allowed_files` to `frontend_readonly_files` in profiles.
- Update `claude-analyzer.md` packet template to emit both `Allowed files` and `Read-only files` sections.
- Update `codex-validator.md` packet-scope rule to fail when a writable glob duplicates a read-only glob.

Estimated effort: 4-6 hours; touches profile schema + sample profile + both prompts + sample artifacts.

### META-06 (round 3, medium) — bash variable quoting

> `scripts/codex-validate.sh` builds CLI flags as unquoted strings; spaces / quotes / newlines in paths or feature IDs could split arguments or break JSON.

What to do:
- Switch flag construction to a Bash argv array (`CMD=(codex exec --sandbox read-only ...)` then `"${CMD[@]}"`).
- Replace heredoc JSON skip output with `node -e 'process.stdout.write(JSON.stringify({...}))'`.

Estimated effort: 1-2 hours; needs careful shell quoting tests.

### META-08 (round 3, medium) — broader test coverage

> Tests do not cover orchestration / failure modes (fake codex, multi-bundle, source_ref bounds, profile-derived scope).

What to do:
- Add a `tests/fake-codex/` helper that simulates exit codes and stdout for the wrapper.
- Add `tests/cli-resolve.test.ts` exercising no-arg, single-arg, two-arg paths against fixtures.
- Add `tests/source-ref-bounds.test.ts` that loads a fixture spec and checks every `source_refs.*.start/end` is within the cited doc.

Estimated effort: half a day.

### META-09 (round 3, medium) — packaging for marketplace

> bin/spec-harness.mjs depends on `tsx` from devDependencies; no build/prepack path.

What to do:
- Add `npm run build` → `tsc -p tsconfig.build.json` outputting `dist/`.
- Change `bin/spec-harness.mjs` to require dist when present, fall back to tsx for development.
- Add `prepublishOnly` script.
- Document Claude Code skill/command installation in README (where to place `.claude/commands/spec-harness.md`).

Estimated effort: half a day.

## Rejected

None this session. Every meta-review finding was either accepted-applied or accepted-deferred with a documented plan.

## Notes

- All blocking-severity (critical/high) findings have been resolved in code + the review.create sample regenerated cleanly with 0 Codex findings.
- The remaining 5 deferred items are all medium severity and represent productionization / public-release work rather than safety-critical defects.
- The convergence pattern observed (critical → high → medium → low → deferred) matches the design intent: each Codex pass surfaces finer-grained issues, and the harness's role is to make those issues legible and triageable, not to claim perfection.
