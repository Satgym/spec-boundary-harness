import { promises as fs, statSync } from "node:fs";
import path from "node:path";
import { exists } from "../util/fs.js";

export interface DetectedInput {
  inputDir: string;
  featureId: string;
}

export interface DetectResult {
  candidates: DetectedInput[];
  searchedRoots: string[];
}

const SEARCH_ROOTS = ["inputs", "examples"];

function looksLikeInput(entryPath: string): boolean {
  // A directory is treated as an input bundle when at least one of these
  // subdirectories or files is present.
  return ["prd", "plaud", "endpoints", "design", "profile.yaml"].some((sub) => {
    try {
      statSync(path.join(entryPath, sub));
      return true;
    } catch {
      return false;
    }
  });
}

// Convert a folder name into a feature id.
//   "auth.login"       -> "auth.login"   (kept as-is)
//   "auth-login"       -> "auth.login"   (dashes -> dot)
//   "auth_login"       -> "auth.login"   (underscores -> dot)
//   "auth/login"       -> "auth.login"
//   anything else      -> kept as-is, with whitespace collapsed
export function folderNameToFeatureId(name: string): string {
  const normalized = name.trim().replace(/\s+/g, "-");
  if (/^[a-z0-9]+(\.[a-z0-9]+)+$/i.test(normalized)) return normalized;
  return normalized.replace(/[\/_-]/g, ".");
}

export async function detectInputs(rootDir: string): Promise<DetectResult> {
  const out: DetectedInput[] = [];
  const searched: string[] = [];
  for (const subdir of SEARCH_ROOTS) {
    const full = path.join(rootDir, subdir);
    searched.push(full);
    if (!(await exists(full))) continue;
    const entries = await fs.readdir(full, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const entryPath = path.join(full, e.name);
      if (!looksLikeInput(entryPath)) continue;
      out.push({
        inputDir: entryPath,
        featureId: folderNameToFeatureId(e.name),
      });
    }
  }
  return { candidates: out, searchedRoots: searched };
}
