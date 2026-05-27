import path from "node:path";
import { spawn } from "node:child_process";
import { ensureDir, writeText } from "../util/fs.js";
import { checkArtifacts, checkCodexReport } from "../validate/zod-only.js";

export interface ValidateOptions {
  rootDir: string;
  inputDir: string;
  featureId: string;
}

export interface ValidateResult {
  ok: boolean;
  preflight: { missing: number; unparseable: number };
  codexInvoked: boolean;
  reportOk: boolean;
  issues: string[];
}

export async function validateCommand(opts: ValidateOptions): Promise<ValidateResult> {
  const { rootDir, inputDir, featureId } = opts;
  await ensureDir(path.join(rootDir, "reports"));

  // 1) Preflight: did Claude actually write all 11 artifacts?
  const featureDir = path.join(rootDir, "specs", featureId);
  const preflight = await checkArtifacts(featureDir);
  const summaryLines: string[] = [];
  for (const m of preflight.missing) {
    summaryLines.push(`MISSING: ${m.path}`);
  }
  for (const u of preflight.unparseable) {
    summaryLines.push(`UNPARSEABLE (YAML): ${u.path} — ${u.reason}`);
  }
  if (!preflight.ok) {
    // Still proceed to Codex so we get cross-validation, but flag preflight issues.
    console.log(
      `validate: preflight found ${preflight.missing.length} missing / ${preflight.unparseable.length} unparseable artifacts.`
    );
  }

  // 2) Invoke Codex via the bash wrapper (read-only).
  const script = path.join(rootDir, "scripts", "codex-validate.sh");
  const codex = await new Promise<number>((resolve) => {
    const child = spawn("bash", [script, inputDir, featureId], {
      cwd: rootDir,
      stdio: "inherit",
      env: { ...process.env, ROOT_DIR: rootDir },
    });
    child.on("exit", (c) => resolve(c ?? 1));
  });
  const codexInvoked = codex === 0;

  // 3) Re-validate Codex JSON output against Zod schema.
  const reportPath = path.join(rootDir, "reports", "codex-validation-report.json");
  const reportCheck = await checkCodexReport(reportPath);
  if (!reportCheck.ok) {
    for (const issue of reportCheck.issues) summaryLines.push(`CODEX-REPORT: ${issue}`);
  }

  // 3b) Codex wrapper exits 0 even when it skipped (e.g. codex CLI absent or
  // unsafe flag combination). In that case the JSON's notes/input_summary
  // contains "skipped" and findings is empty. Treat that as a validation
  // failure rather than a quiet pass — see META-01.
  let codexSkipped = false;
  try {
    const raw = await (await import("node:fs")).promises.readFile(reportPath, "utf8");
    const parsed = JSON.parse(raw) as { notes?: string | null; input_summary?: string };
    if (parsed.notes === "skipped" || /not invoked/i.test(parsed.input_summary ?? "")) {
      codexSkipped = true;
      summaryLines.push("CODEX-SKIPPED: validator did not actually run; see reports/codex-validation-report.md");
    }
  } catch {
    // unreachable when reportCheck.ok is true; ignored otherwise
  }

  // 4) Write preflight summary alongside Codex output for human consumption.
  const summaryPath = path.join(rootDir, "reports", "validate-preflight.md");
  await writeText(
    summaryPath,
    [
      "# Validate Preflight",
      "",
      `Generated: ${new Date().toISOString()}`,
      `Feature: ${featureId}`,
      `Input directory: ${inputDir}`,
      `Specs directory: ${featureDir}`,
      "",
      `Missing artifacts: ${preflight.missing.length}`,
      `Unparseable YAML: ${preflight.unparseable.length}`,
      `Codex wrapper exited 0: ${codexInvoked}`,
      `Codex actually ran (not skipped): ${codexInvoked && !codexSkipped}`,
      `Codex report schema-valid: ${reportCheck.ok}`,
      "",
      "## Issues",
      "",
      summaryLines.length === 0 ? "- (none)" : summaryLines.map((l) => `- ${l}`).join("\n"),
    ].join("\n")
  );

  const ok = preflight.ok && codexInvoked && reportCheck.ok && !codexSkipped;
  console.log(
    `validate: preflight=${preflight.ok ? "ok" : "issues"} codex=${codexSkipped ? "skipped" : codexInvoked ? "ran" : "failed"} report=${reportCheck.ok ? "schema-valid" : "schema-invalid"} ok=${ok}`
  );
  return {
    ok,
    preflight: {
      missing: preflight.missing.length,
      unparseable: preflight.unparseable.length,
    },
    codexInvoked: codexInvoked && !codexSkipped,
    reportOk: reportCheck.ok,
    issues: summaryLines,
  };
}
