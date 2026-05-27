import { describe, expect, it } from "vitest";
import {
  CodexValidationReportSchema,
  CodexFindingSchema,
  ProjectProfileSchema,
  TriageReportSchema,
  ExpectedArtifactFiles,
} from "../src/schemas/index.js";

describe("CodexFindingSchema", () => {
  it("accepts a complete finding", () => {
    const parsed = CodexFindingSchema.parse({
      id: "BV-01",
      validator: "boundary-violation",
      severity: "high",
      feature_id: "auth.login",
      artifact: "specs/auth.login/08-frontend-claude-packet.md",
      message: "Frontend responsibilities include password verification.",
      evidence: "Allowed scope: 'Verify password client-side'",
      suggested_fix: "Move password verification to backend packet (L3).",
    });
    expect(parsed.validator).toBe("boundary-violation");
  });
  it("rejects a finding missing nullable keys (strict parity)", () => {
    const result = CodexFindingSchema.safeParse({
      id: "BV-01",
      validator: "boundary-violation",
      severity: "high",
      message: "missing nullable keys",
    });
    expect(result.success).toBe(false);
  });
  it("rejects a finding with an extra unknown property", () => {
    const result = CodexFindingSchema.safeParse({
      id: "BV-01",
      validator: "boundary-violation",
      severity: "high",
      feature_id: null,
      artifact: null,
      message: "x",
      evidence: null,
      suggested_fix: null,
      sneaky: 1,
    });
    expect(result.success).toBe(false);
  });
  it("rejects an unknown validator name", () => {
    const result = CodexFindingSchema.safeParse({
      id: "X-01",
      validator: "made-up",
      severity: "low",
      message: "x",
    });
    expect(result.success).toBe(false);
  });
  it("rejects an unknown severity", () => {
    const result = CodexFindingSchema.safeParse({
      id: "X-01",
      validator: "other",
      severity: "extreme",
      message: "x",
    });
    expect(result.success).toBe(false);
  });
});

describe("generated_at must parse as a real timestamp (META-09 regression)", () => {
  it("rejects a non-parseable timestamp", () => {
    const result = CodexValidationReportSchema.safeParse({
      generated_at: "not-a-date",
      feature_id: null,
      input_summary: "x",
      findings: [],
      notes: null,
    });
    expect(result.success).toBe(false);
  });
  it("accepts ISO 8601 with Z suffix", () => {
    const result = CodexValidationReportSchema.safeParse({
      generated_at: "2026-05-27T00:00:00Z",
      feature_id: null,
      input_summary: "x",
      findings: [],
      notes: null,
    });
    expect(result.success).toBe(true);
  });
  it("accepts ISO 8601 with timezone offset (Codex format)", () => {
    const result = CodexValidationReportSchema.safeParse({
      generated_at: "2026-05-27T11:53:43+09:00",
      feature_id: null,
      input_summary: "x",
      findings: [],
      notes: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("CodexValidationReportSchema (strict, mirrors JSON Schema)", () => {
  it("accepts a complete report with nulls", () => {
    const r = CodexValidationReportSchema.parse({
      generated_at: "2026-05-27T00:00:00Z",
      feature_id: null,
      input_summary: "Read PRD and transcript.",
      findings: [],
      notes: null,
    });
    expect(r.findings).toEqual([]);
  });
  it("rejects a report missing nullable keys (META-02 regression)", () => {
    const result = CodexValidationReportSchema.safeParse({
      generated_at: "x",
      input_summary: "y",
      findings: [],
    });
    expect(result.success).toBe(false);
  });
  it("rejects when findings is missing", () => {
    const result = CodexValidationReportSchema.safeParse({
      generated_at: "x",
      feature_id: null,
      input_summary: "y",
      notes: null,
    });
    expect(result.success).toBe(false);
  });
  it("rejects extra keys at the top level (.strict())", () => {
    const result = CodexValidationReportSchema.safeParse({
      generated_at: "x",
      feature_id: null,
      input_summary: "y",
      findings: [],
      notes: null,
      extra: "should be rejected",
    });
    expect(result.success).toBe(false);
  });
});

describe("ProjectProfileSchema", () => {
  it("parses the Flutter profile", () => {
    const r = ProjectProfileSchema.parse({
      id: "flutter-riverpod-openapi",
      platform: "flutter",
      state_management: "riverpod",
      api_contract: "openapi",
      architecture: "feature-first",
      frontend_allowed_files: ["lib/features/**/presentation/**"],
      frontend_forbidden_files: ["server/**"],
      backend_allowed_files: ["server/**"],
      backend_forbidden_files: ["lib/features/**/presentation/**"],
    });
    expect(r.platform).toBe("flutter");
  });
});

describe("TriageReportSchema", () => {
  it("accepts an empty decision list", () => {
    const r = TriageReportSchema.parse({
      generated_at: "x",
      validation_report_path: "reports/codex-validation-report.json",
      decisions: [],
    });
    expect(r.decisions.length).toBe(0);
  });
  it("accepts accepted / rejected / needs_human_decision", () => {
    const r = TriageReportSchema.parse({
      generated_at: "x",
      validation_report_path: "reports/codex-validation-report.json",
      decisions: [
        { finding_id: "1", decision: "accepted", reason: "safe", applied_change: "moved item to L3" },
        { finding_id: "2", decision: "rejected", reason: "false positive" },
        { finding_id: "3", decision: "needs_human_decision", reason: "scope question" },
      ],
    });
    expect(r.decisions.length).toBe(3);
  });
});

describe("ExpectedArtifactFiles", () => {
  it("declares exactly 11 files in the documented order", () => {
    expect(ExpectedArtifactFiles).toEqual([
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
    ]);
  });
});
