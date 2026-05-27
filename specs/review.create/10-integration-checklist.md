# Integration Checklist — 상품 리뷰 작성 (review.create)

- [ ] `06-openapi.patch.yaml`이 백엔드/프론트 양쪽에 리뷰/머지된 후 클라이언트 통합 작업 시작.
- [ ] ReviewRequest / Review / ReviewError DTO가 OpenAPI codegen 또는 수동 작성으로 양쪽에서 일치.
- [ ] 7가지 화면 상태(initial/loading/success/validation_error/permission_denied/duplicate/network_error)가 모두 픽스처로 도달 가능 (mock repository 기반 위젯 테스트).
- [ ] 욕설/비속어 필터링이 **서버에서만** 수행되는지 grep으로 검증 — 프론트 코드에 금지어 사전이 들어가지 않았음을 확인.
- [ ] 권한 검증이 **서버에서만** 수행되는지 — 프론트 코드에 "purchased=true 보내면 통과" 같은 우회 경로가 없는지 확인.
- [ ] 중복 검증이 **서버에서만** 수행되는지 — 클라이언트가 GET /reviews를 호출해 미리 차단하는 로직이 없음을 확인 (본 feature 범위 외 엔드포인트 사용 금지).
- [ ] 400 / 401 / 403 / 409 / 5xx / network failure 응답이 각각 validation_error / permission_denied / permission_denied / duplicate / network_error / network_error UI 상태로 매핑됨을 통합 테스트로 확인.
- [ ] 서버 측 입력 형식 재검증(rating 1..5, text 1..500)이 클라이언트 검증과 독립적으로 동작하는지 확인 — 잘못된 값이 서버에 도달해도 거부.
- [ ] (user_id, product_id) unique constraint 또는 동등한 race-condition 보호가 적용되어 있는지 확인.
- [ ] 본 feature 작업이 디자인 시스템(`lib/core/design_system/**`)을 수정하지 않았음을 확인. 새 디자인 시스템 컴포넌트는 별도 PR.
- [ ] 사진 첨부(POST /uploads, photo_id 필드)는 본 feature에서 사용되지 않았음을 확인 — proposal 단계.
- [ ] transcript에 포함된 권한 우회 요청이 어떤 산출물 / 코드에도 인용·반영되지 않았는지 검토.
- [ ] `.env` / `secrets/**` 파일이 어느 작업 단계에서도 읽히지 않았음을 확인.
- [ ] 감사 로그(review.create.event.audit_review_attempt)가 성공/실패 양쪽에 기록되는지 확인.
