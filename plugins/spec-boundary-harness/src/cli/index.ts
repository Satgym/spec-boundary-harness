import path from "node:path";
import { initCommand } from "./init.js";
import { validateCommand } from "./validate.js";
import { detectInputs, folderNameToFeatureId } from "./detect.js";
import { setupCommand } from "./setup.js";

interface CliArgs {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const command = args[0] ?? "help";
  const rest = args.slice(1);
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq >= 0) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const next = rest[i + 1];
        if (next && !next.startsWith("--")) {
          flags[a.slice(2)] = next;
          i++;
        } else {
          flags[a.slice(2)] = true;
        }
      }
    } else {
      positional.push(a);
    }
  }
  return { command, positional, flags };
}

const HELP = `spec-harness <command>

Commands:
  init                                Scaffold directories and ASSUMPTIONS.md.
  setup <featureId>                   Create inputs/<featureId>/prd/기획서.md (PRD template).
                                       Use to bootstrap a new feature bundle.
  detect [featureIdOrDir]             List recognized input bundles (inputs/* and examples/*).
                                       With an argument, prints the resolved <inputDir, featureId>.
  validate [inputDir] [featureId]     Run preflight + Codex read-only validator.
                                       With no args, auto-detects a single input bundle.
                                       With one arg, treats it as a featureId or path.
                                       Writes reports/codex-validation-report.{json,md}
                                       and reports/validate-preflight.md.
  list                                Alias for 'detect' with no arguments.
  help                                Show this message.

This CLI does not analyze, generate, or triage. Those steps are performed by
Claude itself (via the spec-harness skill at .claude/skills/spec-harness),
using prompts/claude-analyzer.md and prompts/claude-finalizer.md.

Conventions:
  inputs/<feature-id>/{prd,plaud,endpoints,design}/   ← preferred location for new work
  examples/<feature-id>/...                            ← bundled samples

Flags:
  --root <dir>                        Override repo root (default: cwd).`;

interface ResolvedArgs {
  inputDir: string;
  featureId: string;
}

async function resolveValidateArgs(
  rootDir: string,
  positional: string[]
): Promise<ResolvedArgs | null> {
  // Cases:
  //   0 args -> auto-detect; require exactly one candidate.
  //   1 arg  -> if path exists, treat as inputDir; featureId derived from folder name.
  //             else treat as featureId; locate matching inputDir under inputs/ or examples/.
  //   2 args -> explicit inputDir + featureId.
  if (positional.length === 0) {
    const det = await detectInputs(rootDir);
    if (det.candidates.length === 0) {
      console.error("No input bundles found in inputs/ or examples/.");
      console.error("Place files at inputs/<feature-id>/{prd,plaud,endpoints,design}/ and retry.");
      return null;
    }
    if (det.candidates.length > 1) {
      console.error("Multiple input bundles detected; specify one explicitly:");
      for (const c of det.candidates) {
        console.error(`  spec-harness validate ${c.featureId}`);
      }
      return null;
    }
    return det.candidates[0];
  }
  if (positional.length === 1) {
    const arg = positional[0];
    const absArg = path.isAbsolute(arg) ? arg : path.join(rootDir, arg);
    try {
      const stat = await (await import("node:fs")).promises.stat(absArg);
      if (stat.isDirectory()) {
        return {
          inputDir: absArg,
          featureId: folderNameToFeatureId(path.basename(absArg)),
        };
      }
    } catch {
      // not a path; treat as feature id
    }
    const det = await detectInputs(rootDir);
    const hit = det.candidates.find((c) => c.featureId === arg);
    if (!hit) {
      console.error(`No input bundle matches featureId '${arg}'.`);
      if (det.candidates.length > 0) {
        console.error("Available:");
        for (const c of det.candidates) console.error(`  ${c.featureId}`);
      } else {
        console.error("(no bundles found at all; try `spec-harness list`)");
      }
      return null;
    }
    return hit;
  }
  const inputDir = positional[0];
  const featureId = positional[1];
  const absInput = path.isAbsolute(inputDir) ? inputDir : path.join(rootDir, inputDir);
  return { inputDir: absInput, featureId };
}

export async function main(argv: string[] = process.argv): Promise<number> {
  const { command, positional, flags } = parseArgs(argv);
  const rootDir = (flags.root as string) ?? process.cwd();

  switch (command) {
    case "init":
      await initCommand(rootDir);
      return 0;
    case "setup": {
      const featureId = positional[0];
      if (!featureId) {
        console.error("usage: spec-harness setup <featureId>");
        console.error("       e.g. spec-harness setup payment.checkout");
        return 2;
      }
      await setupCommand(rootDir, featureId);
      return 0;
    }
    case "validate": {
      const resolved = await resolveValidateArgs(rootDir, positional);
      if (!resolved) return 2;
      const result = await validateCommand({
        rootDir,
        inputDir: resolved.inputDir,
        featureId: resolved.featureId,
      });
      return result.ok ? 0 : 1;
    }
    case "detect":
    case "list": {
      const detection = await detectInputs(rootDir);
      if (positional[0]) {
        const resolved = await resolveValidateArgs(rootDir, positional);
        if (!resolved) return 2;
        console.log(JSON.stringify(resolved, null, 2));
        return 0;
      }
      if (detection.candidates.length === 0) {
        console.log("No input bundles found.");
        console.log("Searched:", detection.searchedRoots.map((s) => path.relative(rootDir, s)).join(", "));
        console.log("Tip: drop a folder under inputs/<feature-id>/ with prd/, plaud/, endpoints/ subdirs.");
        return 1;
      }
      for (const c of detection.candidates) {
        console.log(`${c.featureId}\t${path.relative(rootDir, c.inputDir)}`);
      }
      return 0;
    }
    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      return 0;
    default:
      console.error(`Unknown command: ${command}`);
      console.error(HELP);
      return 2;
  }
}
