import { promises as fs, statSync, readdirSync } from "node:fs";
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

function hasReadableContent(dir: string): boolean {
  // META-03 from meta-review: an empty directory with a recognized subfolder
  // should NOT count as a valid bundle. Require at least one .md/.txt/.yaml/.yml
  // file somewhere under the candidate.
  const stack: string[] = [dir];
  while (stack.length) {
    const d = stack.pop()!;
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (/\.(md|markdown|txt|yaml|yml|json)$/i.test(e.name)) {
        return true;
      }
    }
  }
  return false;
}

function looksLikeInput(entryPath: string): boolean {
  // A directory is treated as an input bundle when:
  //   1) it contains a `prd/` subdirectory with at least one readable file
  //      (the only required marker; the rest of the bundle is free-form), OR
  //   2) for legacy/bundled examples, any of the older markers exists
  //      (prd/plaud/endpoints/design/profile.yaml) AND there is some readable
  //      content somewhere under the candidate.
  const prdDir = path.join(entryPath, "prd");
  let prdIsValid = false;
  try {
    const stat = statSync(prdDir);
    if (stat.isDirectory()) prdIsValid = hasReadableContent(prdDir);
  } catch {
    prdIsValid = false;
  }
  if (prdIsValid) return true;

  // Legacy fallback: an older layout that has a different marker but no prd/.
  const hasLegacyMarker = ["plaud", "endpoints", "design", "profile.yaml"].some((sub) => {
    try {
      statSync(path.join(entryPath, sub));
      return true;
    } catch {
      return false;
    }
  });
  if (!hasLegacyMarker) return false;
  return hasReadableContent(entryPath);
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
