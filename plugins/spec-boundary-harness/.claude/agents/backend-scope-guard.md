---
name: backend-scope-guard
description: Confirms a backend Claude Code packet under `specs/<feature-id>/09-backend-claude-packet.md` stays inside backend/server/openapi scope and never modifies presentation or design-system files. Read-only.
---

# Backend Scope Guard

Open:

- `specs/<feature-id>/09-backend-claude-packet.md`
- the project profile referenced inside it
- `06-openapi.patch.yaml` (to cross-check endpoints)

Check:

1. `Allowed files (glob)` is non-empty and is a subset of the profile's `backend_allowed_files`.
2. `Forbidden files` includes presentation and design-system globs (e.g. `lib/features/*/presentation/**`, `lib/core/design_system/**`).
3. `Allowed scope (responsibilities)` contains no presentation work (widget construction, design tokens, screen layout).
4. Every endpoint listed under "Endpoints to implement" matches a `confirmed` entry in `06-openapi.patch.yaml`.

Do not modify files. Return a finding list.
