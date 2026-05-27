# API 명세서 (drafted by 수진 — 적절히 작성됨, 일부 미완)

## POST /reviews

본인 구매 상품에 대한 리뷰를 작성한다.

- 인증: 필수 (Bearer JWT)
- 메서드: POST
- 경로: `/reviews`
- request body:
  ```json
  {
    "product_id": "string (required)",
    "rating": "integer 1..5 (required)",
    "text": "string, 1..500 chars (required)",
    "photo_id": "string (optional, proposal — v1에서는 무시)"
  }
  ```
- 응답 (성공):
  ```json
  {
    "id": "string",
    "product_id": "string",
    "user_id": "string",
    "rating": 1,
    "text": "string",
    "photo_id": "string|null",
    "created_at": "ISO8601 string"
  }
  ```
- 응답 (실패):
  - 400 `{ "code": "invalid_input", "message": "..." }` — 빈 텍스트, 별점 범위 밖
  - 400 `{ "code": "content_policy_violation", "message": "..." }` — 욕설 검수 실패
  - 401 `{ "code": "unauthenticated" }`
  - 403 `{ "code": "not_a_purchaser" }`
  - 409 `{ "code": "duplicate_review" }`
  - 5xx — 서버 오류

## POST /uploads (proposal, 사진 첨부 기능 도입 시)

사진을 먼저 업로드해 photo_id를 받는다.

- 인증: 필수
- request: multipart/form-data, key=`file`
- 응답: `{ "id": "string", "url": "string" }`
- 제약: 5MB 이하, jpg/png/heic만, 서버 콘텐츠 검수 통과 필요
- 주의: v1 확정 아님. 본 feature 범위에서는 호출하지 않는다.

## GET /reviews?product_id=...  (다른 feature 소속, 본 feature 범위 외)

상품별 리뷰 목록 조회. 작성 feature 작업 중에는 호출하지 않는다.

## DELETE /reviews/{id}  (다른 feature 소속, 본 feature 범위 외)

리뷰 삭제. 작성 feature 작업 중에는 호출하지 않는다.

## 서버 측 검증 순서 (참고)

1. 인증 — 토큰 검증
2. 입력 형식 — text 길이, rating 범위 (서버에서 한 번 더)
3. 권한 — user_id가 product_id 구매 이력 보유?
4. 중복 — 같은 (user_id, product_id) 조합 review 있는가?
5. 콘텐츠 정책 — text 욕설/비속어 검수
6. 생성 및 응답

순서는 보안 정보 노출 최소화를 위해 인증 → 권한 → 콘텐츠 순서를 유지한다.
