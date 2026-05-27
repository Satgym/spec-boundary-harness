// Deterministic checks that LLMs cannot reliably perform themselves.
// Everything semantic (boundary, source grounding, etc.) is the Codex
// validator's job; this module only does:
//   - "did Claude actually write all expected files?"
//   - "is each YAML / JSON parseable?"
//   - "does the Codex validation report match the Zod schema?"
// Nothing here makes pass/fail judgments about boundary rules.

import { promises as fs } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import {
  CodexValidationReportSchema,
  ExpectedArtifactFiles,
} from "../schemas/index.js";

export interface ArtifactCheckIssue {
  path: string;
  reason: string;
}

export interface ArtifactCheckResult {
  missing: ArtifactCheckIssue[];
  unparseable: ArtifactCheckIssue[];
  ok: boolean;
}

export async function checkArtifacts(featureDir: string): Promise<ArtifactCheckResult> {
  const missing: ArtifactCheckIssue[] = [];
  const unparseable: ArtifactCheckIssue[] = [];
  for (const file of ExpectedArtifactFiles) {
    const fullPath = path.join(featureDir, file);
    try {
      const text = await fs.readFile(fullPath, "utf8");
      if (file.endsWith(".yaml")) {
        try {
          YAML.parse(text);
        } catch (e) {
          unparseable.push({ path: fullPath, reason: (e as Error).message });
        }
      }
    } catch {
      missing.push({ path: fullPath, reason: "file does not exist" });
    }
  }
  return { missing, unparseable, ok: missing.length === 0 && unparseable.length === 0 };
}

export interface ReportCheckResult {
  ok: boolean;
  issues: string[];
}

export async function checkCodexReport(jsonPath: string): Promise<ReportCheckResult> {
  let raw: string;
  try {
    raw = await fs.readFile(jsonPath, "utf8");
  } catch {
    return { ok: false, issues: [`report not found at ${jsonPath}`] };
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { ok: false, issues: [`report is not valid JSON: ${(e as Error).message}`] };
  }
  const parsed = CodexValidationReportSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  return { ok: true, issues: [] };
}
