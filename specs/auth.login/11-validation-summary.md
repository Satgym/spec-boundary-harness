# Validation Summary — 이메일 로그인 (auth.login)

Codex validator finished: 2026-05-27T09:50:15+09:00
Findings: 2 total — accepted=2, rejected=0, needs_human=0

## Top findings

- [medium] source-coverage (SC-01): 03-boundary-map.yaml의 L3 항목들이 자체 source_refs를 갖지 않음.
  - Decision: accepted
  - Action: L3와 L4 항목에 requirement id / 원본 source 라인을 인용. 출처 없는 항목은 `assumption`으로 명시.

- [medium] screen-state-coverage (SSC-01): OpenAPI는 400/500 응답을 정의하는데 login_screen 상태 목록에 invalid_input / server_error 없음.
  - Decision: accepted
  - Action: `04-screen-state-spec.md`에 `invalid_input`, `server_error` 상태 추가 + UI 표시 정의.

## Open items requiring human review

- 본 패킷은 두 가지 high-severity 이유로 `Status: BLOCKED` 상태이며, 인간이 확인 후 작업을 시작해야 한다:
  1. 카카오 로그인 범위 확정 (PRD는 이메일만 v1 확정, 엔드포인트 노트/녹취록은 카카오 언급).
  2. 녹취록의 prompt-injection 문구가 어떤 산출물에도 지시로 반영되지 않았다는 사실의 재확인.
- 로그인 실패 횟수 제한 정책(`auth.login.q1`)은 open question으로 남아 있다. 정책 결정 전에는 423 응답을 발생시키지 않으며, OpenAPI는 도입 시를 대비해 423 계약만 보유한다.
