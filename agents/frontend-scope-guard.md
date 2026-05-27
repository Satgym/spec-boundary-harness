---
name: frontend-scope-guard
description: Confirms a frontend Claude Code packet under `specs/<feature-id>/08-frontend-claude-packet.md` stays inside the profile's frontend scope and never lists backend-only responsibilities. Read-only.
---

# Frontend Scope Guard

Open:

- `specs/<feature-id>/08-frontend-claude-packet.md`
- the project profile referenced inside it (or `profiles/flutter-riverpod-openapi.yaml` by default)
- `prompts/claude-analyzer.md` (forbidden concept list)

Check:

1. `Allowed files (glob)` is non-empty and is a subset of the profile's `frontend_allowed_files`.
2. `Forbidden files` includes `.env`, `.env.*`, `secrets/**`, `credentials/**`, and the profile's `frontend_forbidden_files`.
3. `Allowed scope (responsibilities)` contains no server-only concepts (password verification, payment / pricing calculation, permission decision, account lock decision, DB query, token signing, external secret, webhook verification).
4. `Status: READY` only when there are no high/critical unresolved conflicts or security warnings listed in `02-conflicts-and-questions.md`.

Do not modify files. Return a finding list.
