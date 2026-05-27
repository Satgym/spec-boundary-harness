# Integration Checklist — 이메일 로그인 (auth.login)

- [ ] `06-openapi.patch.yaml`이 리뷰되고 백엔드/프론트 양쪽에 머지된 후 클라이언트 통합 작업 시작.
- [ ] LoginRequest / LoginResponse / LoginError DTO가 OpenAPI codegen 또는 수동 작성으로 양쪽에서 일치.
- [ ] 8가지 화면 상태(initial/loading/success/invalid_credentials/account_locked/invalid_input/server_error/network_error)가 모두 픽스처로 도달 가능.
- [ ] 비밀번호 검증은 서버에서만 수행 (auth.login.r3) — 프론트 코드에 비밀번호 검증 로직이 없는지 grep으로 검증.
- [ ] 400 / 401 / 423 / 5xx / network failure 응답이 각각 invalid_input / invalid_credentials / account_locked / server_error / network_error UI 상태로 매핑됨을 통합 테스트로 확인.
- [ ] 카카오 / refresh / me 엔드포인트가 본 feature에 잘못 포함되지 않았는지 확인.
- [ ] 02-conflicts-and-questions.md의 모든 high-severity 충돌이 해소될 때까지 패킷 상태는 BLOCKED 유지.
- [ ] 녹취록 prompt-injection 문구가 어떤 산출물에도 인용/적용되지 않았는지 grep으로 재확인.
- [ ] 로그인 시도 감사 로그가 기록되는지 (`07-background-events.yaml`의 auth.login.event.audit_login_attempt).
- [ ] 로그인 실패 횟수 제한 정책(open question)이 도입될 경우 별도 PR로 처리하고, 423 응답 사용 여부를 정책 결정 시점에 명시.
- [ ] 본 feature 작업이 디자인 시스템(`lib/core/design_system/**`) 파일을 수정하지 않았음을 확인.
- [ ] `.env` / `secrets/**` 파일이 어느 작업 단계에서도 읽히지 않았음을 확인.
