# Codex Meta Reviewer — Spec Boundary Harness itself

You are reviewing the **Spec Boundary Harness repository itself**, not a feature spec.

The harness is an LLM-driven planning compiler. Claude analyzes inputs and writes 11 spec artifacts; the harness invokes you (Codex) as a read-only validator with a fixed JSON Schema; then Claude triages your findings and applies safe fixes. This meta-review evaluates the harness's design, code, prompts, schemas, and example outputs.

You are **read-only**. Do not edit files. Do not run destructive commands. Do not access secrets.

## What to read

- `README.md`, `CLAUDE.md`, `LICENSE`
- `.claude/commands/spec-harness.md`
- `.claude/skills/spec-harness/SKILL.md`
- `.claude/agents/*.md`
- `prompts/claude-analyzer.md`
- `prompts/codex-validator.md`
- `prompts/claude-finalizer.md`
- `schemas/codex-validation-report.schema.json`
- `scripts/codex-validate.sh`
- `src/cli/*.ts`
- `src/schemas/index.ts`
- `src/validate/zod-only.ts`
- `src/util/*.ts`
- `src/llm/render-validation-md.mjs`
- `bin/spec-harness.mjs`
- `package.json`, `tsconfig.json`, `vitest.config.ts`
- `rules/*.yaml`
- `profiles/flutter-riverpod-openapi.yaml`
- `tests/*.ts`
- `inputs/review.create/` (the latest exercised sample input)
- `specs/review.create/01-*.yaml` through `specs/review.create/11-*.md` (the artifacts Claude produced)
- `reports/codex-validation-report.md`, `reports/codex-triage.md`

## What to evaluate

### 1. Deterministic safety net coverage

Is the "Zod + YAML parse + file presence" preflight sufficient for what it claims to guarantee? What can pass preflight while still being unusable downstream? Look at `src/validate/zod-only.ts` and how the CLI consumes its result.

### 2. JSON Schema strict mode

Does `schemas/codex-validation-report.schema.json` correctly enforce the structured output? Is the OpenAI strict-mode requirement (all properties in `required`, nullable types) consistently applied? What happens if Codex returns extra keys or omits optional ones?

### 3. Prompt design

Are the three Claude/Codex prompts coherent? Specifically:
- Does `claude-analyzer.md` give Claude enough to produce the 11 artifacts consistently?
- Does `codex-validator.md` enumerate the 8 validators clearly enough that two runs against the same inputs would converge?
- Does `claude-finalizer.md` prevent Claude from "fixing" a finding by violating a non-negotiable principle?

### 4. Skill / slash command orchestration

Does `.claude/skills/spec-harness/SKILL.md` describe a procedure that a fresh Claude session can follow without earlier conversation context? Same for `.claude/commands/spec-harness.md`. Is the no-argument auto-detection actually safe, or could it pick the wrong bundle silently?

### 5. CLI surface

Look at `src/cli/index.ts`, `src/cli/validate.ts`, `src/cli/detect.ts`. Are exit codes, argument parsing, and auto-detection robust? What happens if multiple input bundles exist? If an input bundle is empty? If `specs/<feature>/` does not exist when validate runs?

### 6. Codex invocation safety

Look at `scripts/codex-validate.sh`. Does it conservatively skip when read-only mode cannot be confirmed? Does it pass the JSON Schema correctly? Does the schema-detection logic actually find the `--output-schema` flag in the current Codex version? Does the bash JSON-extraction fallback (the awk-based largest-object scrape) introduce risks?

### 7. Rule / profile loading

`rules/*.yaml` and `profiles/flutter-riverpod-openapi.yaml` are static text. Are they actually consumed by Claude (via prompts) and Codex (via the validator prompt)? Or are they decorative? If decorative, document that explicitly.

### 8. Boundary discipline carried by prompts

Both `claude-analyzer.md` and `codex-validator.md` enumerate the L0–L4 model and forbidden concepts. Do they agree? Could a discrepancy lead to Claude generating something that Codex would also accept, but that violates the documented model?

### 9. Test coverage

Look at `tests/`. Are the tests covering the deterministic surface (Zod schemas, file presence, YAML parse, Codex JSON shape)? What's NOT tested? Are there areas that probably should be covered but aren't?

### 10. Example output quality

Open the latest run output under `specs/review.create/` and `reports/`. Does the bundle actually behave as the prompts say it should? Specifically:
- transcript prompt-injection captured as security warning (only)?
- frontend packet has no backend-only responsibilities?
- backend packet has no presentation-only responsibilities?
- source_refs point at real lines?
- packet status (READY/BLOCKED) consistent with conflicts/security warnings?

### 11. Documentation accuracy

Does README.md describe what actually happens? Are paths in CLAUDE.md and SKILL.md correct? Does the README's "Quickstart" actually work from a clean clone?

### 12. Failure modes

What goes wrong in real-world use? List the top systemic risks, especially:
- Codex outage / authentication failure
- Inputs that are mostly transcript (low trust) with no PRD
- Multi-feature input bundle in one folder
- Korean + English mixed inputs (the existing sample uses both)
- A user trying to "fix" finding by manually editing specs/* between rounds
- Cost / latency growth as artifact count grows

### 13. What's missing for a public repo

If this were released to a marketplace like awesome-claude-code or the Claude Code plugin marketplace, what would block it from being adopted? What's missing relative to comparable tooling? Be specific.

## Output format (strict)

Return a single JSON object matching the same schema as `schemas/codex-validation-report.schema.json` (so the harness can reuse the validator render pipeline). Use `validator: "other"` for meta findings and set `feature_id: null`.

```json
{
  "generated_at": "<ISO 8601>",
  "feature_id": null,
  "input_summary": "<one paragraph: what you read, scope of review, anything noteworthy>",
  "findings": [
    {
      "id": "<short stable id, e.g. META-01>",
      "validator": "other",
      "severity": "low" | "medium" | "high" | "critical",
      "feature_id": null,
      "artifact": "<file path most relevant to the finding, or null>",
      "message": "<one or two sentences>",
      "evidence": "<quote or specific file:line reference; required when possible>",
      "suggested_fix": "<concrete suggestion>"
    }
  ],
  "notes": "<optional global notes on systemic risks, missing tests, marketplace readiness>"
}
```

Return JSON only. No markdown fences, no surrounding prose. Findings array may be empty.

Do not include speculative findings without evidence. Do not edit any file.
