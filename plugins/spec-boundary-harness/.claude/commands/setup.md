---
description: Bootstrap a new feature input bundle in the current project. Creates inputs/<feature-id>/prd/기획서.md with a PRD template; the user then drops free-form notes loose under the same folder. Usage — /spec-boundary-harness:setup <feature-id>
---

The user invoked: `/spec-boundary-harness:setup $ARGUMENTS`

This command creates an empty input bundle in **the user's current project directory**. After it runs, the user has a PRD skeleton ready to fill; they can then drop free-form notes (transcripts, summaries, API drafts, design notes) loose under the same bundle directory.

## Step 0 — Validate arguments

If `$ARGUMENTS` is empty, do NOT run anything. Tell the user:

> 사용법: `/spec-boundary-harness:setup <feature-id>`
> 예: `/spec-boundary-harness:setup payment.checkout`
>
> Feature id는 점 표기를 권장합니다 (`auth.login`, `payment.checkout`). 대시(`auth-login`)나 언더스코어(`auth_login`)도 자동으로 점으로 정규화됩니다.

and stop.

If `$ARGUMENTS` contains the feature id (and possibly extra whitespace), proceed.

## Step 1 — Locate the wrapper

Use the same lookup snippet as the main `spec-harness` command:

```bash
ls "${CLAUDE_PLUGIN_ROOT:-}/scripts/spec-harness.sh" 2>/dev/null \
  || ls "$HOME/.claude/plugins/marketplaces/spec-boundary-harness/scripts/spec-harness.sh" 2>/dev/null \
  || ls "$HOME/.claude/plugins"/*/spec-boundary-harness/scripts/spec-harness.sh 2>/dev/null \
  || ls "$HOME/.claude/plugins/marketplaces"/*/spec-boundary-harness/scripts/spec-harness.sh 2>/dev/null \
  || ls "$HOME/.claude/plugins/marketplaces"/*/plugins/spec-boundary-harness/scripts/spec-harness.sh 2>/dev/null \
  || ls "$HOME/.claude/plugins/installed"/*/spec-boundary-harness/scripts/spec-harness.sh 2>/dev/null \
  || find "$HOME/.claude/plugins" -maxdepth 6 -type f -name 'spec-harness.sh' -path '*scripts*' 2>/dev/null | head -1 \
  || ls "$(pwd)/scripts/spec-harness.sh" 2>/dev/null
```

Use the first printed path as `$SH`. If nothing prints, tell the user the plugin is not installed and stop.

## Step 2 — Run the setup CLI

```bash
$SH setup $ARGUMENTS
```

The wrapper sets `--root` to the user's current project. The CLI creates:

- `inputs/<feature-id>/prd/` (folder)
- `inputs/<feature-id>/prd/기획서.md` (Korean PRD template with 8 sections)

If the PRD file already exists, the CLI leaves it untouched and tells the user.

## Step 3 — Hand off

Relay the CLI's stdout to the user (it's already in Korean). Add a short summary of what was created and what the user should do next:

1. 생성된 PRD template 경로 (`inputs/<feature-id>/prd/기획서.md`).
2. 다음 단계 안내:
   - 기획서.md를 열어 8개 섹션을 채우기 (또는 필요 없는 섹션은 비워두기).
   - 회의록 / 요약 / API 초안 / UI 노트 같은 자유 자료는 `inputs/<feature-id>/` 직속에 자유로운 이름의 `.md` 파일로 평평하게 두기. 한국어 파일명 OK. 폴더로 묶고 싶으면 그것도 OK.
   - 다 채운 뒤 `/spec-boundary-harness:spec-harness` 로 실행.

Do not commit changes. Do not create anything beyond what the CLI created.
