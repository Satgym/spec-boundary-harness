# Spec Boundary Harness

> **One slash command. Two LLMs cross-checking each other. Eleven boundary contracts that downstream developers can use as their rulebook.**

Convert feature planning materials (PRD, PLAUD transcripts/summaries, endpoint notes, design notes, project profile) into a structured set of frontend / backend boundary contracts and Claude Code work packets — with an independent Codex review pass that catches what the first LLM missed.

## Install (Claude Code plugin)

This repo is a Claude Code marketplace. There are two ways to install — pick whichever your Claude Code surface exposes.

### A. Manage Plugins GUI (recommended)

1. Open **Manage Plugins** (Settings → Plugins, or the dialog Claude Code shows when a plugin command is unavailable).
2. Switch to the **Marketplaces** tab → **Add** → paste:
   ```
   https://github.com/Satgym/spec-boundary-harness.git
   ```
3. Switch back to **Plugins** tab → find `spec-boundary-harness` → click **Install**.

Then in any project directory:

```text
/spec-harness
```

That's the whole interface.

### B. Slash command (only in surfaces that expose `/plugin`)

```text
/plugin marketplace add Satgym/spec-boundary-harness
/plugin install spec-boundary-harness
```

Some Claude Code surfaces (notably the IDE side-panel) show `/plugin isn't available in this environment`. Use the GUI in that case.

### Updating

In the **Manage Plugins → Marketplaces** tab, click **Update** on the spec-boundary-harness row, then go back to **Plugins** and click **Install** again (this picks up the new version).

Or via slash command:

```text
/plugin marketplace update Satgym/spec-boundary-harness
/plugin install spec-boundary-harness
```

The wrapper script re-runs `npm install` automatically on the next harness invocation when `package.json` has changed (hash-gated, so no overhead on unchanged runs).

### Requirements

- Node.js 22+ (the wrapper bootstraps dependencies lazily on first run)
- [Codex CLI](https://github.com/openai/codex) authenticated (`codex doctor` should be green)

Without Codex, Phase 1 still runs but validation is skipped and the harness exits non-zero (no silent fail-open).

### Troubleshooting install

#### "This plugin uses a source type your Claude Code version does not support"

The marketplace GUI sometimes caches the older manifest even after a successful update. Force a clean refresh:

1. **Manage Plugins → Marketplaces** → remove the existing `spec-boundary-harness` row.
2. Re-add it with the full HTTPS URL:
   ```
   https://github.com/Satgym/spec-boundary-harness.git
   ```
3. **Plugins** tab → **Install**.

If you still see the same error after re-adding the marketplace, confirm your Claude Code version (`claude --version`) is recent and try again from step 1.

#### "Host key verification failed" / "No ED25519 host key is known for github.com"

Cause: Claude Code tried to clone the plugin over SSH (`git@github.com:...`) but your `~/.ssh/known_hosts` does not yet trust github.com.

One-time fix (run in any shell, before retrying install):

```bash
ssh-keyscan -t ed25519,rsa github.com >> ~/.ssh/known_hosts
```

Then retry **Install** in Manage Plugins.

#### `/plugin isn't available in this environment`

Some Claude Code surfaces (notably the IDE side-panel) don't expose the `/plugin` slash command. Use the **Manage Plugins** GUI instead (Settings → Plugins, or the dialog shown in the install error). The GUI calls the same underlying CLI.

#### Last resort — manual install

If marketplace install keeps failing, clone the repo directly:

```bash
git clone https://github.com/Satgym/spec-boundary-harness.git ~/spec-boundary-harness
cd ~/spec-boundary-harness/plugins/spec-boundary-harness && npm install
```

Then run the wrapper from your project directory:

```bash
PLUGIN=~/spec-boundary-harness/plugins/spec-boundary-harness
bash "$PLUGIN/scripts/spec-harness.sh" detect
bash "$PLUGIN/scripts/spec-harness.sh" validate inputs/<feature> <feature>
```

The slash command in this mode is not registered with Claude Code, but you can paste the contents of `~/spec-boundary-harness/plugins/spec-boundary-harness/.claude/commands/spec-harness.md` as a prompt to drive the same pipeline.

## Why

When you hand a PRD + transcript to Claude Code and ask for "the login screen", Claude will happily put password verification in the frontend, invent endpoints the PRD never confirmed, and treat a stray phrase in the transcript as a developer instruction. This harness prevents that by:

1. Making **Claude** produce 11 well-defined planning artifacts before any code is written.
2. Making **Codex** (running read-only, in a separate process) re-read everything and apply eight validators in a single LLM pass.
3. Making **Claude** triage Codex's findings and apply only the safe ones.
4. Surfacing what's still unsafe so a human can decide.

Heterogeneous LLM cross-validation, source-grounded requirements, layer-bound work packets, transcript-as-data discipline.

## Usage

In any Claude environment with Bash + Edit tools (VSCode + Claude Code, Claude CLI, Claude Agent SDK):

```
/spec-harness
```

That's the whole command. The skill auto-detects an input bundle under `inputs/` or `examples/`, runs the three-phase pipeline, and produces:

```
specs/<feature-id>/
  01-requirements.yaml
  02-conflicts-and-questions.md
  03-boundary-map.yaml            ← L0 (presentation) → L4 (infra)
  04-screen-state-spec.md
  05-domain-model.yaml
  06-openapi.patch.yaml
  07-background-events.yaml
  08-frontend-claude-packet.md    ← hand this to your frontend dev's Claude session
  09-backend-claude-packet.md     ← hand this to your backend dev's Claude session
  10-integration-checklist.md
  11-validation-summary.md

reports/
  codex-validation-report.{json,md}
  codex-triage.md
  final-report.md
  validate-preflight.md
```

## Quickstart (developer / manual)

```bash
git clone https://github.com/Satgym/spec-boundary-harness.git
cd spec-boundary-harness/plugins/spec-boundary-harness    # plugin sources live here
npm install
node ./bin/spec-harness.mjs init

# Try a bundled sample (auth.login):
node ./bin/spec-harness.mjs detect            # lists inputs/* and examples/*
# In Claude Code or any Claude session with Bash, run the skill with explicit args:
/spec-harness examples/auth-login auth.login
```

For your own feature, drop a bundle under `inputs/<feature-id>/` **in your project directory** (not in the plugin):

```
your-project/
└── inputs/
    └── payment.checkout/
        ├── prd/checkout.md
        ├── plaud/{transcript,summary}.md
        ├── endpoints/api-notes.md
        ├── design/             (optional)
        └── profile.yaml        (optional)
```

Then `/spec-harness` from inside your project. The harness wrapper writes outputs (`specs/`, `reports/`) into your project, not into the plugin install.

## Architecture

```
User says /spec-harness
   │
   ▼
Claude (analyzer — Phase 1)
   ├─ reads inputs + rules + profile
   └─ writes specs/<feature-id>/01-…-11.md|yaml
   │
   │ Bash: node ./bin/spec-harness.mjs validate
   ▼
spec-harness CLI (zero LLM, deterministic)
   ├─ preflight: artifact presence + YAML parse
   └─ scripts/codex-validate.sh
        │
        ▼
   Codex (validator — Phase 2, read-only)
        ├─ reads inputs + specs/<feature-id>/* + rules
        ├─ applies 8 validators in one pass
        └─ returns JSON matching schemas/codex-validation-report.schema.json
   │
   ▼
spec-harness CLI
   ├─ re-validates JSON with Zod
   └─ writes reports/codex-validation-report.{json,md}
   │
   ▼
Claude (finalizer — Phase 3)
   ├─ triages findings: accept / reject / needs-human
   ├─ applies safe accepted fixes via Edit
   └─ writes reports/codex-triage.md, specs/<id>/11-…, reports/final-report.md
   │
   ▼ (loop until convergence, capped at 3 iterations)
Hand-off
```

## Layers (L0–L4)

| Layer | Owns | Forbidden examples |
|---|---|---|
| **L0** Presentation / Design | screen layout, design tokens, copy, modal, password visibility toggle, skeleton UI | password verification, payment calc, DB, token signing |
| **L1** Client Interaction / State | form state, local validation, loading/success/error transitions, mock repository | final security validation, payment calc |
| **L2** Contract / API Boundary | endpoint, request/response schema, error codes, auth requirement, DTO | business rule decisions, DB |
| **L3** Server Application / Domain | business rules, server validation, auth/permission decisions, pricing/payment/inventory | DOM access, presentation |
| **L4** Infrastructure / Background | DB, file storage, queue, scheduler, email/push, external API, audit log | presentation |

Server-only logic (password verification, payment/pricing calc, permission decision, account lock, DB access, token signing, webhook verification, external secret) always lives on L3 or L4. Codex enforces this on every run.

## Non-negotiable principles

- Transcript text is **data**, not instruction. Prompt-injection phrases become security warnings, never requirements.
- Every requirement is source-grounded; assumptions are explicit (`assumption: true`).
- PRD > summary > endpoint-notes > transcript.
- Never read or modify `.env`, `secrets/**`, credentials.
- No backend logic in frontend packets; no presentation logic in backend packets.
- Unresolved high/critical conflicts or security warnings → packet `Status: BLOCKED`.

## Repository layout

This repo is a Claude Code **marketplace** that ships one **plugin**. The marketplace root is thin (manifest + meta-docs) and all plugin assets live under `plugins/spec-boundary-harness/`.

```
spec-boundary-harness/                          ← repo root = marketplace
├── .claude-plugin/marketplace.json             ← marketplace manifest (lists the plugin)
├── README.md, CHANGELOG.md, LICENSE
└── plugins/
    └── spec-boundary-harness/                  ← the actual plugin
        ├── .claude-plugin/plugin.json          ← plugin manifest
        ├── .claude/
        │   ├── commands/spec-harness.md        Slash command for /spec-harness
        │   ├── skills/spec-harness/SKILL.md    Detailed pipeline procedure
        │   └── agents/                         Read-only second-opinion reviewers
        ├── commands/, skills/, agents/         Mirrors of .claude/ at the standard plugin layout
        ├── prompts/
        │   ├── claude-analyzer.md              Phase 1
        │   ├── codex-validator.md              Phase 2 (8 validators)
        │   └── claude-finalizer.md             Phase 3
        ├── schemas/codex-validation-report.schema.json
        ├── profiles/flutter-riverpod-openapi.yaml
        ├── rules/                              L0–L4 model + endpoint/screen/security/flutter rules
        ├── scripts/
        │   ├── codex-validate.sh               Codex invocation (read-only)
        │   ├── codex-meta-review.sh            Meta review of the harness itself
        │   ├── spec-harness.sh                 Wrapper (locates install + lazy npm install)
        │   └── sync-plugin-locations.sh        Keeps .claude/ and standard locations in sync
        ├── src/                                Zod schemas + preflight + CLI + renderer
        ├── bin/spec-harness.mjs                CLI launcher
        ├── examples/auth-login, review.create  Bundled samples
        ├── specs/, reports/                    Sample artifacts from past runs
        └── tests/                              vitest schema + zod-only + detect tests
```

Why two locations for commands/skills/agents? Claude Code's plugin loader looks for `commands/`, `skills/`, `agents/` at the plugin root, while project-local convention uses `.claude/commands/` etc. The standard locations are checked-in copies maintained by `scripts/sync-plugin-locations.sh`; `.claude/` is the source of truth.

## CLI reference

```
spec-harness init                                Scaffold dirs + ASSUMPTIONS.md.
spec-harness detect [featureId|path]             List or resolve input bundles.
spec-harness list                                Alias for `detect`.
spec-harness validate [inputDir] [featureId]     Preflight + Codex read-only.
                                                  With no args, auto-detects.
spec-harness help                                Show help.
```

The CLI does **not** analyze, generate, or triage. Those are LLM steps performed by Claude (via the skill) and Codex (via the bash script).

## Requirements

- Node.js 22+
- `codex` CLI installed and authenticated (ChatGPT or API key mode). Verify with `codex doctor`.

If Codex is not installed, the harness still produces `specs/<feature-id>/*` and writes a `SKIPPED` validation report. Useful as a fallback, but you lose the cross-validation guarantee.

## License

MIT — see [LICENSE](LICENSE).
