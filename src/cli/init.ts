import path from "node:path";
import { ensureDir, exists, writeText } from "../util/fs.js";

const DEFAULT_DIRS = [
  "profiles",
  "rules",
  "rules/proposed",
  "prompts",
  "examples",
  "specs",
  "evals",
  "evals/golden",
  "evals/regression",
  "evals/proposed",
  "reports",
  "reports/failure-reports",
  "scripts",
  "schemas",
  "src",
  "docs",
  ".claude/agents",
  ".claude/skills/spec-harness",
];

export async function initCommand(rootDir: string): Promise<void> {
  for (const d of DEFAULT_DIRS) {
    await ensureDir(path.join(rootDir, d));
  }
  const assumptions = path.join(rootDir, "ASSUMPTIONS.md");
  if (!(await exists(assumptions))) {
    await writeText(
      assumptions,
      [
        "# Assumptions",
        "",
        "This file records non-source-grounded assumptions made by the harness or by humans.",
        "Each entry should explain the assumption, why it was made, and how to verify it later.",
        "",
      ].join("\n")
    );
  }
  console.log("init: directories ensured, ASSUMPTIONS.md scaffolded if missing.");
}
