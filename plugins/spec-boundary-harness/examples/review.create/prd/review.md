# PRD — 상품 리뷰 작성 (v1)

작성자: 지수 (PM)
상태: 확정 (사진 첨부 항목만 proposal)

## 1. 목적

구매자가 본인이 구매한 상품에 대해 별점과 짧은 텍스트 리뷰를 남길 수 있게 한다.

## 2. 확정 범위

- 별점 1~5 (정수)
- 텍스트 리뷰 (최대 500자, 빈 값 금지)
- 본인 구매 상품에만 작성 가능 (서버 검증)
- 한 사용자가 한 상품에 한 번만 작성 가능 (서버 검증)
- 욕설/비속어 필터링 (서버 검증)
- 작성 완료 후 이전 화면으로 돌아가며 성공 토스트 노출

## 3. 화면

- 별도 페이지 `/review/new?product_id=<id>`
- 모달 아님

## 4. 상태

- 초기 (initial)
- 제출 중 (loading)
- 성공 (success — pop + toast)
- 입력 오류 (validation_error — 빈 별점 또는 빈 텍스트)
- 권한 없음 (permission_denied — 비구매자 또는 미인증)
- 중복 리뷰 (duplicate — 이미 작성한 상품)
- 네트워크 오류 (network_error)

## 5. API

- POST /reviews
- 인증 필수
- request: `{ product_id, rating, text }`
- response: 생성된 review 객체
- error codes: 400 (validation/욕설), 401 (미인증), 403 (비구매), 409 (중복), 5xx

## 6. proposal (v1 확정 아님)

- 사진 첨부 1장. 도입 시:
  - 별도 업로드 엔드포인트 (예: POST /uploads)에 사진을 먼저 올려 photo_id 획득
  - POST /reviews 요청 body에 `photo_id` 옵셔널 필드 추가
  - 사진 검수(부적절 콘텐츠 차단)는 서버 책임

## 7. 범위 외

- 리뷰 조회 / 수정 / 삭제
- 상품 상세 페이지 통합
- 평균 평점 집계
