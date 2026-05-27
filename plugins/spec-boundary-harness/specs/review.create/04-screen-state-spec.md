# Screen State Spec — 상품 리뷰 작성 (review.create)

## review_form_screen (/review/new?product_id=&lt;id&gt;)

- initial
- loading
- success
- validation_error
- permission_denied
- duplicate
- network_error

각 상태에 대응하는 UI 표시:

- **initial** — 별점/텍스트 비어 있음. 별점 영역과 텍스트 영역 정상 색상. 제출 버튼 disabled. 별점과 텍스트 둘 다 채워지면 제출 버튼 enabled.
- **loading** — 제출 버튼에 인라인 스피너. 입력 영역 readonly. 뒤로 가기는 허용하되 폐기 확인 dialog 노출.
- **success** — 화면 닫히고 이전 화면으로 navigation pop. 이전 화면 상단에 SuccessToast "리뷰가 등록되었습니다" 2초 노출.
- **validation_error** — 클라이언트 즉시 피드백. 별점 빈 경우 별점 영역 빨강 아웃라인 + "별점을 선택해주세요" 헬퍼. 텍스트 빈 경우 텍스트 영역 빨강 아웃라인 + "내용을 입력해주세요" 헬퍼. 서버에서 400 invalid_input / content_policy_violation 응답을 받은 경우에도 같은 상태로 진입하며, ErrorBanner에 서버 message를 추가 노출.
- **permission_denied** — ErrorBanner "구매하신 상품에 대해서만 리뷰를 작성할 수 있습니다." 입력 영역 비활성. 제출 버튼 disabled. (HTTP 403 not_a_purchaser 또는 401 unauthenticated)
- **duplicate** — ErrorBanner "이미 이 상품에 리뷰를 작성하셨습니다." 입력 영역 비활성. 제출 버튼 disabled. (HTTP 409 duplicate_review)
- **network_error** — ErrorBanner "일시적인 네트워크 오류입니다. 다시 시도해주세요." Retry 액션. (HTTP 5xx 또는 네트워크 응답 자체 없음)

## Error code → UI state mapping

| HTTP status | server code | UI state |
|---|---|---|
| 200 / 201 | (n/a) | success |
| 400 | invalid_input | validation_error |
| 400 | content_policy_violation | validation_error (with server message) |
| 401 | unauthenticated | permission_denied (재로그인 안내) |
| 403 | not_a_purchaser | permission_denied |
| 409 | duplicate_review | duplicate |
| 5xx | (any) | network_error |
| network failure (no response) | (n/a) | network_error |

`validation_error` 상태는 클라이언트 즉시 피드백(빈 값)과 서버 응답(욕설/형식 오류) 모두를 수용한다. UI 메시지의 출처를 구분해 보여준다.

## Notes

- 본 화면은 POST /reviews 비동기 호출에 의존하므로 loading / success / network_error는 필수다 (review.create.r9).
- **7가지 상태**는 PRD line 26-32가 명시한 목록이다. plaud/summary.md:11은 "6가지"라고 표현했지만 이는 initial을 제외한 결과 상태만 센 결과이며, 본 spec은 initial 포함 7가지로 통일한다. 추가 상태(예: 사진 업로드 진행률)는 사진 첨부 proposal이 confirmed될 때 도입한다.
