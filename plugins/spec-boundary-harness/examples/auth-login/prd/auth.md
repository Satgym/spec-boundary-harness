# Auth Login PRD

## Confirmed scope

- Only email login is confirmed for the v1 release.
- Login requires email + password.
- 비밀번호 검증은 서버에서 수행한다.
- The login screen must render initial, loading, success, invalid_credentials, account_locked, and network_error states.

## Out of scope

- Social login (Kakao/Google/Apple) is not confirmed; it is a proposal only.

## API expectations

- POST /auth/login is the canonical endpoint.

## Open items

- 로그인 실패 횟수 제한을 적용할 것인가? (account lock policy)
