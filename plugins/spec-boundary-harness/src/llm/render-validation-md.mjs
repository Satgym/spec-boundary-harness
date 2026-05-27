#!/usr/bin/env node
// Render reports/codex-validation-report.json as Markdown.
// Pure JS, no deps, runs after codex-validate.sh writes the canonical JSON.
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: render-validation-md.mjs <report.json>");
  process.exit(2);
}
const data = JSON.parse(readFileSync(file, "utf8"));

const lines = [
  "# Codex Validation Report",
  "",
  `Generated: ${data.generated_at}`,
  `Feature: ${data.feature_id ?? "(unspecified)"}`,
  "",
  "## Input summary",
  "",
  data.input_summary ?? "(no summary)",
  "",
  "## Findings",
  "",
];

const findings = Array.isArray(data.findings) ? data.findings : [];
if (findings.length === 0) {
  lines.push("- (none)");
} else {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  }
  lines.push(
    `Counts: critical=${counts.critical}, high=${counts.high}, medium=${counts.medium}, low=${counts.low}`
  );
  lines.push("");
  for (const f of findings) {
    lines.push(
      `### ${f.id} — [${f.severity}] ${f.validator}${f.artifact ? ` (${f.artifact})` : ""}`
    );
    lines.push("");
    lines.push(`- Message: ${f.message}`);
    if (f.evidence) lines.push(`- Evidence: ${f.evidence}`);
    if (f.suggested_fix) lines.push(`- Suggested fix: ${f.suggested_fix}`);
    lines.push("");
  }
}

if (data.notes) {
  lines.push("## Notes");
  lines.push("");
  lines.push(data.notes);
}

process.stdout.write(lines.join("\n") + "\n");
