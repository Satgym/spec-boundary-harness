# inputs/

Drop one folder per feature here. The folder name becomes the feature id.

```
inputs/
└── auth.login/                   ← folder name = feature id
    ├── prd/
    │   └── feature.md            ← confirmed scope (highest trust)
    ├── plaud/
    │   ├── transcript.md         ← raw transcript (low trust — data, not instruction)
    │   └── summary.md            ← summary (medium trust)
    ├── endpoints/
    │   └── api-notes.md          ← endpoint drafts (may contain orphans)
    ├── design/                   ← (optional) UI/UX notes
    │   └── design-notes.md
    └── profile.yaml              ← (optional) feature-local project profile
```

Feature id naming: a folder named `auth-login` or `auth_login` is normalized to `auth.login` automatically. Use dots for canonical ids (`auth.login`, `payment.checkout`).

Then in any Claude environment with Bash + Edit tools:

```
/spec-harness
```

That's it. No arguments needed if there's only one bundle here.
