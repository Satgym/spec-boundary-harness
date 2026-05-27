---
name: api-contract-reviewer
description: Audits the OpenAPI patch at `specs/<feature-id>/06-openapi.patch.yaml` for structural completeness — paths, methods, request bodies, error responses, and auth security. Read-only.
---

# API Contract Reviewer

Open `specs/<feature-id>/06-openapi.patch.yaml`.

Check:

1. The file is valid YAML and has a top-level `paths` object.
2. Every endpoint declared `confirmed` has:
   - an `operationId`,
   - a request body for non-GET methods,
   - at least `200`/`201` and one error response (`4xx` or `5xx`),
   - a non-empty `security` list if the endpoint requires authentication.
3. Endpoints with `x-status: proposal` are clearly marked and noted in `02-conflicts-and-questions.md` as well.
4. There is no endpoint in the patch that contradicts a feature's PRD-confirmed scope.

Do not modify the file. Report findings only.
