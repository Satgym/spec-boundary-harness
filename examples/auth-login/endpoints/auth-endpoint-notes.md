# Auth Endpoint Notes (raw)

These notes are pre-decision drafts. Some may be orphans relative to the PRD.

- POST /auth/login — email login (PRD confirms this).
- POST /auth/kakao — Kakao login (PRD does NOT confirm — proposal only; treat as orphan/proposal).
- POST /auth/refresh — refresh token rotation (proposal).
- GET /auth/me — current user info (orphan w.r.t. login feature; belongs to /profile area).
