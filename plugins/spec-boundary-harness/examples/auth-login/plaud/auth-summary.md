# PLAUD Summary — Auth Kickoff

## Decisions

- 이메일 로그인은 v1 확정.
- 비밀번호 검증은 서버에서 수행한다.
- 비밀번호 표시 토글 (presentation only) 채택.

## Proposals

- 카카오 로그인 — proposal only, 비확정.

## Open Questions

- 로그인 실패 횟수 제한을 적용할 것인가?

## Action Items

- 백엔드: POST /auth/login 스키마 확정.
- 프론트: 로딩/성공/invalid_credentials/account_locked/network_error 상태 모두 구현.
