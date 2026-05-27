# Screen State Spec — 이메일 로그인 (auth.login)

## login_screen (/login)

- initial
- loading
- success
- invalid_credentials
- account_locked
- invalid_input
- server_error
- network_error

각 상태에 대응하는 UI 표시:

- **initial** — 빈 폼, 이메일/비밀번호 필드, 비밀번호 표시 토글, "로그인" PrimaryButton.
- **loading** — PrimaryButton 비활성화 + 스피너 또는 ButtonLoadingState. 입력 필드 read-only.
- **success** — 로그인 완료 후 다음 화면으로 라우팅(범위 외). 이 상태는 매우 짧게 나타나거나 직접 다음 화면으로 전환.
- **invalid_credentials** — ErrorBanner: "이메일 또는 비밀번호가 올바르지 않습니다." 입력 유지.
- **account_locked** — ErrorBanner: "계정이 잠겼습니다. (정책에 따라 안내 문구 변경 가능)" 입력 비활성화.
- **invalid_input** — 필드별 인라인 오류 표시. 예: 이메일 형식 오류, 빈 비밀번호. (HTTP 400 응답 매핑)
- **server_error** — ErrorBanner: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요." Retry 액션 제공. (HTTP 5xx 응답 매핑)
- **network_error** — ErrorBanner: "네트워크 오류. 잠시 후 다시 시도해주세요." Retry 액션 제공. (네트워크 응답 자체가 오지 않는 경우)

비고: invalid_input과 server_error는 PRD의 6가지 상태 목록에는 명시되어 있지 않으나, OpenAPI 계약(400 / 500 응답)을 UI 상태로 매핑하기 위해 본 spec에서 추가한다. 이는 codex-validation-report 'SSC-01' 수용에 따른 변경이다.

## Error code → UI state mapping

| HTTP status | UI state |
|---|---|
| 200 / 201 | success |
| 400 | invalid_input (필드 단위 오류로 표시) |
| 401 | invalid_credentials |
| 423 | account_locked |
| 5xx | server_error |
| network failure (no response) | network_error |

server_error와 network_error는 서로 다른 UI 상태로 분리한다. 둘 다 Retry 액션을 제공하지만 메시지가 다르다.

## Notes

- 이 화면은 POST /auth/login을 비동기 호출하므로 loading/success/network_error가 모두 필수다.
- invalid_credentials는 401 응답을 받았을 때 보여주는 상태로, 서버 결정에 의존한다 (L3 책임).
- account_locked는 423 응답을 받았을 때 보여주는 상태로, 서버 결정에 의존한다 (L3 책임). 실패 횟수 제한 정책 적용 여부는 open question으로 남아 있다.
