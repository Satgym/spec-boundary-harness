import { z } from "zod";

export const Severity = z.enum(["low", "medium", "high", "critical"]);
export type Severity = z.infer<typeof Severity>;

// One finding produced by the Codex validator pass.
// The Codex CLI is invoked with --output-schema so the JSON it returns must
// match this exact shape; the spec-harness CLI then re-validates with Zod
// before Claude reads it.
// Nullable required: every key must be present, but optional fields accept
// `null`. This mirrors the JSON Schema's strict-mode contract — see META-02
// in the meta-review. The Zod check is now exact-parity with the JSON Schema
// the wrapper enforces; extra keys are rejected via `.strict()`.
const nullableString = z.union([z.string(), z.null()]);

export const CodexFindingSchema = z
  .object({
    id: z.string(),
    validator: z.enum([
      "source-coverage",
      "boundary-violation",
      "endpoint-coverage",
      "screen-state-coverage",
      "openapi-patch",
      "conflict-blocking",
      "prompt-injection",
      "packet-scope",
      "other",
    ]),
    severity: Severity,
    feature_id: nullableString,
    artifact: nullableString,
    message: z.string(),
    evidence: nullableString,
    suggested_fix: nullableString,
  })
  .strict();
export type CodexFinding = z.infer<typeof CodexFindingSchema>;

// generated_at must parse as a valid date (loosely accepting RFC 3339 / ISO 8601
// + common variants). META-09 in the meta-review flagged that the schema
// accepted any string here.
const isoTimestamp = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "generated_at must be a parseable timestamp" });

export const CodexValidationReportSchema = z
  .object({
    generated_at: isoTimestamp,
    feature_id: nullableString,
    input_summary: z.string(),
    findings: z.array(CodexFindingSchema),
    notes: nullableString,
  })
  .strict();
export type CodexValidationReport = z.infer<typeof CodexValidationReportSchema>;

// What Claude is supposed to write before calling the validator.
// We don't constrain the body content (Claude writes prose/YAML/Markdown),
// but we do require that each feature has the 11 expected files.
export const ExpectedArtifactFiles = [
  "01-requirements.yaml",
  "02-conflicts-and-questions.md",
  "03-boundary-map.yaml",
  "04-screen-state-spec.md",
  "05-domain-model.yaml",
  "06-openapi.patch.yaml",
  "07-background-events.yaml",
  "08-frontend-claude-packet.md",
  "09-backend-claude-packet.md",
  "10-integration-checklist.md",
  "11-validation-summary.md",
] as const;
export type ExpectedArtifactFile = (typeof ExpectedArtifactFiles)[number];

// Triage entry written by Claude after reading the Codex validation report.
export const TriageDecisionSchema = z.object({
  finding_id: z.string(),
  decision: z.enum(["accepted", "rejected", "needs_human_decision"]),
  reason: z.string(),
  applied_change: z.string().optional(),
});
export type TriageDecision = z.infer<typeof TriageDecisionSchema>;

export const TriageReportSchema = z.object({
  generated_at: z.string(),
  validation_report_path: z.string(),
  decisions: z.array(TriageDecisionSchema),
});
export type TriageReport = z.infer<typeof TriageReportSchema>;

// Project profile is unchanged in spirit but simplified.
export const ProjectProfileSchema = z.object({
  id: z.string(),
  platform: z.string(),
  state_management: z.string().optional(),
  api_contract: z.string().optional(),
  architecture: z.string().optional(),
  frontend_allowed_files: z.array(z.string()).default([]),
  frontend_forbidden_files: z.array(z.string()).default([]),
  backend_allowed_files: z.array(z.string()).default([]),
  backend_forbidden_files: z.array(z.string()).default([]),
  layer_mapping: z.record(z.array(z.string())).optional(),
  generated_file_policy: z.string().optional(),
});
export type ProjectProfile = z.infer<typeof ProjectProfileSchema>;
