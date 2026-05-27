import { describe, expect, it, beforeAll } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { setupCommand } from "../src/cli/setup.js";

const TMP = path.join(os.tmpdir(), `sbh-setup-${process.pid}`);

beforeAll(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.mkdir(TMP, { recursive: true });
});

describe("setupCommand", () => {
  it("creates inputs/<feature>/prd/기획서.md from scratch", async () => {
    const root = path.join(TMP, "fresh");
    await fs.mkdir(root, { recursive: true });
    const r = await setupCommand(root, "payment.checkout");
    expect(r.featureId).toBe("payment.checkout");
    expect(r.createdPrd).toBe(true);
    expect(r.alreadyExisted).toBe(false);
    const prdPath = path.join(root, "inputs", "payment.checkout", "prd", "기획서.md");
    const content = await fs.readFile(prdPath, "utf8");
    expect(content).toMatch(/# PRD — payment\.checkout/);
    expect(content).toMatch(/v1 확정 범위/);
    expect(content).toMatch(/open question/);
  });

  it("does not overwrite an existing PRD", async () => {
    const root = path.join(TMP, "existing");
    const prdDir = path.join(root, "inputs", "review.create", "prd");
    await fs.mkdir(prdDir, { recursive: true });
    await fs.writeFile(path.join(prdDir, "기획서.md"), "USER-CONTENT", "utf8");
    const r = await setupCommand(root, "review.create");
    expect(r.createdPrd).toBe(false);
    expect(r.alreadyExisted).toBe(true);
    const content = await fs.readFile(path.join(prdDir, "기획서.md"), "utf8");
    expect(content).toBe("USER-CONTENT");
  });

  it("normalizes dashed feature ids to dotted", async () => {
    const root = path.join(TMP, "dashed");
    const r = await setupCommand(root, "auth-login");
    expect(r.featureId).toBe("auth.login");
    const prdPath = path.join(root, "inputs", "auth.login", "prd", "기획서.md");
    await fs.access(prdPath);
  });

  it("throws when featureId is empty", async () => {
    const root = path.join(TMP, "empty");
    await expect(setupCommand(root, "")).rejects.toThrow(/featureId required/);
  });
});
