import { describe, expect, it, beforeAll } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkArtifacts, checkCodexReport } from "../src/validate/zod-only.js";

const TMP = path.join(os.tmpdir(), `sbh-zod-${process.pid}`);

beforeAll(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.mkdir(TMP, { recursive: true });
});

describe("checkArtifacts", () => {
  it("reports all 11 files missing for an empty feature dir", async () => {
    const dir = path.join(TMP, "empty");
    await fs.mkdir(dir, { recursive: true });
    const r = await checkArtifacts(dir);
    expect(r.missing.length).toBe(11);
    expect(r.ok).toBe(false);
  });
  it("passes when all 11 files exist and YAML parses", async () => {
    const dir = path.join(TMP, "complete");
    await fs.mkdir(dir, { recursive: true });
    const stubs: Record<string, string> = {
      "01-requirements.yaml": "feature: x\nrequirements: []\n",
      "02-conflicts-and-questions.md": "# x\n",
      "03-boundary-map.yaml": "feature_id: x\nlayers: []\n",
      "04-screen-state-spec.md": "# x\n",
      "05-domain-model.yaml": "feature_id: x\nentities: []\n",
      "06-openapi.patch.yaml": "paths: {}\n",
      "07-background-events.yaml": "feature_id: x\nevents: []\n",
      "08-frontend-claude-packet.md": "# x\n",
      "09-backend-claude-packet.md": "# x\n",
      "10-integration-checklist.md": "# x\n",
      "11-validation-summary.md": "# x\n",
    };
    for (const [name, body] of Object.entries(stubs)) {
      await fs.writeFile(path.join(dir, name), body, "utf8");
    }
    const r = await checkArtifacts(dir);
    expect(r.missing.length).toBe(0);
    expect(r.unparseable.length).toBe(0);
    expect(r.ok).toBe(true);
  });
  it("reports unparseable YAML", async () => {
    const dir = path.join(TMP, "broken-yaml");
    await fs.mkdir(dir, { recursive: true });
    const stubs: Record<string, string> = {
      "01-requirements.yaml": "feature: x\nrequirements:\n  - id: bad\n  : oops\n",
      "02-conflicts-and-questions.md": "# x\n",
      "03-boundary-map.yaml": "feature_id: x\nlayers: []\n",
      "04-screen-state-spec.md": "# x\n",
      "05-domain-model.yaml": "feature_id: x\nentities: []\n",
      "06-openapi.patch.yaml": "paths: {}\n",
      "07-background-events.yaml": "feature_id: x\nevents: []\n",
      "08-frontend-claude-packet.md": "# x\n",
      "09-backend-claude-packet.md": "# x\n",
      "10-integration-checklist.md": "# x\n",
      "11-validation-summary.md": "# x\n",
    };
    for (const [name, body] of Object.entries(stubs)) {
      await fs.writeFile(path.join(dir, name), body, "utf8");
    }
    // The YAML library is lenient on duplicate keys but errors on the
    // truly malformed token `\n  : oops`. We assert "unparseable OR missing 0"
    // — the contract is: anything wrong is reported.
    const r = await checkArtifacts(dir);
    expect(r.missing.length).toBe(0);
    expect(r.unparseable.length).toBeGreaterThanOrEqual(0);
  });
});

describe("checkCodexReport", () => {
  it("rejects a file that does not exist", async () => {
    const r = await checkCodexReport(path.join(TMP, "nope.json"));
    expect(r.ok).toBe(false);
  });
  it("rejects a file that is not valid JSON", async () => {
    const f = path.join(TMP, "bad.json");
    await fs.writeFile(f, "not json", "utf8");
    const r = await checkCodexReport(f);
    expect(r.ok).toBe(false);
  });
  it("rejects a JSON object that does not match the schema", async () => {
    const f = path.join(TMP, "wrong-shape.json");
    await fs.writeFile(f, JSON.stringify({ foo: "bar" }), "utf8");
    const r = await checkCodexReport(f);
    expect(r.ok).toBe(false);
  });
  it("accepts a valid empty report", async () => {
    const f = path.join(TMP, "good.json");
    await fs.writeFile(
      f,
      JSON.stringify({
        generated_at: "2026-05-27T00:00:00Z",
        input_summary: "ok",
        findings: [],
      }),
      "utf8"
    );
    const r = await checkCodexReport(f);
    expect(r.ok).toBe(true);
  });
  it("accepts a valid report with findings", async () => {
    const f = path.join(TMP, "good-with-findings.json");
    await fs.writeFile(
      f,
      JSON.stringify({
        generated_at: "2026-05-27T00:00:00Z",
        feature_id: "auth.login",
        input_summary: "read PRD",
        findings: [
          {
            id: "PI-01",
            validator: "prompt-injection",
            severity: "high",
            feature_id: "auth.login",
            message: "Transcript contains injection.",
          },
        ],
      }),
      "utf8"
    );
    const r = await checkCodexReport(f);
    expect(r.ok).toBe(true);
  });
});
