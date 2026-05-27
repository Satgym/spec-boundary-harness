# 디자인 노트 — 리뷰 작성 (도윤)

## 화면 구성 `/review/new?product_id=<id>`

1. 상단 헤더: ← 뒤로 + "리뷰 작성" 타이틀 + 제출 버튼 (우상단, disabled 기본)
2. 상품 정보 카드 (썸네일 + 상품명) — readonly
3. RatingStars (1~5 별 아이콘, 좌측부터 채움, tap/hover 즉시 반응)
4. ReviewTextArea (최대 500자, 글자수 카운터, placeholder "상품에 대한 의견을 남겨주세요")
5. (proposal — v1 미포함) PhotoAttachField

## 컴포넌트

- **RatingStars** — 디자인 시스템 신규 추가
- **ReviewTextArea** — 디자인 시스템 신규 추가 (글자수 카운터 포함)
- **SuccessToast** — 디자인 시스템 기존 컴포넌트 재사용 (이미 있음)
- **ErrorBanner** — 기존 재사용

## 상태별 UI

- **initial** — 별점/텍스트 비어 있음, 제출 버튼 disabled. 별점과 텍스트 둘 다 채워지면 제출 버튼 enabled.
- **loading** — 제출 버튼에 스피너, 입력 영역 readonly.
- **success** — 화면 닫히고 이전 화면으로 pop. 이전 화면 상단에 "리뷰가 등록되었습니다" 토스트 2초 노출.
- **validation_error** — 클라이언트 즉시 피드백. 별점이 빈 경우 별점 영역 흔들기 + 빨강 아웃라인. 텍스트가 빈 경우 텍스트 영역 빨강 아웃라인 + "내용을 입력해주세요" 헬퍼.
- **permission_denied** — ErrorBanner "구매하신 상품에 대해서만 리뷰를 작성할 수 있습니다." 제출 버튼 disabled.
- **duplicate** — ErrorBanner "이미 이 상품에 리뷰를 작성하셨습니다." 제출 버튼 disabled.
- **network_error** — ErrorBanner "일시적인 네트워크 오류입니다. 다시 시도해주세요." Retry 액션.

## 인터랙션

- 별점 탭 → 즉시 채움 (L0)
- 텍스트 입력 → 글자수 카운터 갱신 (L0)
- 제출 버튼 → POST /reviews 호출 (L1)
- 뒤로 가기 → 현재 입력 폐기 확인 다이얼로그 (이중 확인은 안 함, 단순 confirm)

## 디자인 시스템 작업

- 본 feature 작업 시 디자인 시스템 컴포넌트(RatingStars, ReviewTextArea)를 새로 추가해야 한다.
- 추가는 **별도 PR로 분리**. 본 feature의 프론트엔드 패킷에서 디자인 시스템 작업이 동시에 일어나지 않도록 분기.
