# Assumptions

This file records non-source-grounded assumptions made by the harness or by humans.
Each entry should explain the assumption, why it was made, and how to verify it later.

## Initial scaffolding (auto)

- **Default architecture**: feature-first, OpenAPI for contracts. Why: matches the supplied Flutter+Riverpod profile. Verify by reading any project profile YAML.
- **Default screen states for async flows**: `loading`, `success`, `network_error`. Why: minimum coverage required to render a real UI under failure. Verify against `rules/screen-state-rules.yaml`.
- **Boundary defaults**: a requirement that mentions DB / password verification / payment-pricing / permission decision / account lock / webhook / external secret is L3 or L4, regardless of context. Why: zero-trust against transcript drift.
- **Auth requirement default**: every non-GET endpoint requires auth unless explicitly marked anonymous. Why: prefer false alarms over silent over-exposure.
