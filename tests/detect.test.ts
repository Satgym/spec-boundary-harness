import { describe, expect, it, beforeAll } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { detectInputs, folderNameToFeatureId } from "../src/cli/detect.js";

const TMP = path.join(os.tmpdir(), `sbh-detect-${process.pid}`);

beforeAll(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.mkdir(TMP, { recursive: true });
});

describe("folderNameToFeatureId", () => {
  it("preserves canonical dotted ids", () => {
    expect(folderNameToFeatureId("auth.login")).toBe("auth.login");
    expect(folderNameToFeatureId("payment.checkout")).toBe("payment.checkout");
  });
  it("normalizes dashes and underscores to dots", () => {
    expect(folderNameToFeatureId("auth-login")).toBe("auth.login");
    expect(folderNameToFeatureId("auth_login")).toBe("auth.login");
  });
});

describe("detectInputs", () => {
  it("ignores empty marker directories (META-03 regression)", async () => {
    const root = path.join(TMP, "empty-bundle");
    await fs.mkdir(path.join(root, "inputs", "feature.empty", "prd"), { recursive: true });
    // No content files anywhere under the bundle
    const r = await detectInputs(root);
    expect(r.candidates.length).toBe(0);
  });
  it("accepts a bundle with at least one .md or .yaml file", async () => {
    const root = path.join(TMP, "valid-bundle");
    await fs.mkdir(path.join(root, "inputs", "feature.valid", "prd"), { recursive: true });
    await fs.writeFile(
      path.join(root, "inputs", "feature.valid", "prd", "f.md"),
      "# x\n",
      "utf8"
    );
    const r = await detectInputs(root);
    expect(r.candidates.length).toBe(1);
    expect(r.candidates[0].featureId).toBe("feature.valid");
  });
  it("scans both inputs/ and examples/", async () => {
    const root = path.join(TMP, "both-roots");
    await fs.mkdir(path.join(root, "inputs", "a.x", "prd"), { recursive: true });
    await fs.writeFile(path.join(root, "inputs", "a.x", "prd", "f.md"), "# x\n", "utf8");
    await fs.mkdir(path.join(root, "examples", "b.y", "plaud"), { recursive: true });
    await fs.writeFile(path.join(root, "examples", "b.y", "plaud", "f.md"), "# x\n", "utf8");
    const r = await detectInputs(root);
    const ids = r.candidates.map((c) => c.featureId).sort();
    expect(ids).toEqual(["a.x", "b.y"]);
  });
});
