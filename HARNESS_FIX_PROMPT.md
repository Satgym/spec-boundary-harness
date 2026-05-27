# Spec Boundary Harness — Cross-section consistency 결함 수정 지시

## 0. 컨텍스트

`sbh-test` 프로젝트에서 한 PRD(`reservation_modify_prd.md`) + 회의록 + 엔드포인트 메모를 입력으로 하니스를 돌린 결과 3개 Korean hand-off 문서(`01-공통-규칙.md`, `02-프론트엔드-작업.md`, `03-백엔드-작업.md`)가 생성되었다.

이 결과물을 검증하기 위해 두 개의 격리된 Claude 세션을 띄워:
- **FE 세션**: 01 + 02 만 읽고 Flutter 구현
- **BE 세션**: 01 + 03 만 읽고 Node/TS 구현

각각 mock/실서버 수준까지 끝내고 두 산출물의 인터페이스(endpoint, 요청/응답, 에러 매핑, 상태머신)를 비교한 결과 **3건의 정합 이슈** 중 **2건이 하니스 결함**으로 판명되었다(나머지 1건은 PRD 단계에서 의도적으로 미정으로 둔 Open Question이라 정상 동작).

본 문서는 이 두 결함의 근본 원인과 수정 방향을 정리한다. 하니스 코드/프롬프트를 수정할 때 이대로 따르거나, 동등한 방법으로 대체해도 된다.

---

## 1. 결함 A — 같은 문서 안 cross-section 모순 (M1: PATCH 응답 스키마)

### 1.1 증상

`01-공통-규칙.md` 내부에서 같은 사실이 두 번 진술되는데 **둘이 서로 다르게** 적혀 있다.

- **§2.8 "응답 포맷"** (PRD §5를 그대로 옮김):
  > **변경 성공 응답**: `reservationId`, `revision`, `spaceId`, `spaceName`, `floorId`, `floorName`, `seatId`, `seatName`, `startAt`, `endAt`, `status`, `checkInAvailableFrom`, `checkInDeadline`, `modifiedAt`.

  → `canModify` / `canCancel` / `notModifiableReason` 없음.

- **§6.2 PATCH `/reservations/{reservationId}` 응답 200**:
  > 응답 200: 변경된 예약 상세 (**GET 응답과 동일**).

  → `canModify` / `canCancel` / `notModifiableReason` 포함 (§6.1 GET 응답에 명시되어 있음).

`.archive/.../specs/06-openapi.patch.yaml`도 PATCH 응답 스키마를 `ReservationDetailResponse`(GET과 동일)로 결정했다. 즉 하니스는 §6/OpenAPI에서는 "PATCH = GET" 결정을 내렸지만 **§2.8을 업데이트하지 않아 같은 문서가 두 답을 동시에 말함**.

### 1.2 격리 실험 결과

- BE 세션은 §2.8을 권위로 보고 PATCH 응답에서 UX hint 3개를 제외.
- FE 세션은 §6.2를 권위로 보고 UX hint 3개를 응답에서 읽어오도록 view model 구현.
- 둘 다 자기가 본 문장 그대로 구현. 통합 시 PATCH 직후 FE의 `canModify` 등이 `null`이 되어 화면 갱신이 깨짐.

### 1.3 근본 원인

`claude-analyzer.md` 단계에서 PRD의 자연어 응답 필드 목록(§5)을 `01-공통-규칙.md` §2.8로 옮기는 동작과, endpoint 메모의 "변경된 예약 상세" 표현을 §6/OpenAPI 패치에서 `ReservationDetailResponse`(GET과 동일)로 결정하는 동작이 **별도 단계로 진행**되고 둘 사이의 **일관성 reconciliation 단계가 없다**.

`claude-finalizer.md` 단계에서도 §2.8과 §6.2/§6.1의 응답 필드 목록을 **diff** 해서 일치 여부를 검사하지 않는다.

### 1.4 수정 방향

#### Option A — finalizer에 응답 필드 정합성 검사 추가 (권장)

`prompts/claude-finalizer.md`에 다음 가드를 추가한다:

```
[CHECK: response-field-consistency]
01-공통-규칙.md 작성 직전에 다음을 수행한다.

각 endpoint i 에 대해:
  fields_natural := §2.8(또는 그에 해당하는 자연어 응답 포맷 섹션)에 나열된 필드 집합
  fields_api     := §6.x (API 계약 요약) 또는 06-openapi.patch.yaml 의 응답 스키마 필드 집합

  fields_natural ≠ fields_api 이면:
    1. 자연어 섹션에 "차이가 의도된 것인지" 명시한다 (예: "PATCH 응답은 GET 응답과 동일하지만 UX hint 3개는 GET에서만 제공된다", 또는 "PATCH 응답 = GET 응답 (UX hint 포함)").
    2. 양 섹션 중 한쪽을 권위로 정하고 나머지를 그 권위에 맞춰 다시 쓴다.
    3. 결정이 불가능하면 02-conflicts-and-questions.md 에 conflict 로 등록한다 ("PATCH 응답에 UX hint 포함 여부 미결").
```

#### Option B — analyzer에 schema reference 강제

`prompts/claude-analyzer.md`의 응답 포맷 섹션 작성 규칙을, **OpenAPI 패치의 schema 이름을 자연어 섹션에도 명시하도록** 강제한다.

예: §2.8 변경 성공 응답은 단순 필드 나열 대신 다음 형태로 적는다.

```
**변경 성공 응답** (스키마: `ReservationDetailResponse`, GET 응답과 동일):
- 필드는 §6.1 / 06-openapi.patch.yaml 참조.
- PATCH 응답이 GET과 다르게 일부 필드를 제외한다면 명시적으로 적는다.
```

이렇게 하면 한 곳(OpenAPI 패치)이 권위가 되고 §2.8은 그곳을 가리키는 포인터로 격하된다.

#### Option C — codex-validator 단계에서 cross-section diff

`prompts/codex-validator.md`에 새 룰을 추가:

```
[RULE: rsp-field-cross-section-diff]
대상: 01-공통-규칙.md (또는 동등 문서)
검사: 각 endpoint 의 자연어 응답 필드 목록(§2.8 등) vs API 계약 섹션(§6.x) 의 응답 필드를 비교.
결과: 불일치 발견 시 codex-validation-report 에 finding 으로 기록 ("response-field-mismatch", severity: high).
```

권장: **Option A + Option C 병행**. Option A는 생성 단계에서 막고, Option C는 사후 회귀 방지.

---

## 2. 결함 B — 입력 자체 모순을 conflict로 잡지 못함 (M2: 취소 모달 stale_version 누락)

### 2.1 증상

PRD 안에서 두 사실이 서로 모순된다:

- **PRD §3.5 동시성**: "revision이 최신이 아니면 409 STALE_RESERVATION_VERSION을 반환한다."
- **PRD §3.8 취소 모달 9 상태 enum**: `closed, confirming, loading, success, too_late, already_cancelled, permission_denied, network_error, server_error` — **`stale_version` 없음**.
- **transcript line 39 (BE 발언)**: "stale이면 409 STALE_RESERVATION_VERSION. 프론트는 최신 예약을 다시 불러오고 '다른 기기에서 변경되었습니다' 같은 문구"
- **endpoint 메모 line 73**: "취소도 stale revision이면 409를 반환한다."

즉 **취소 요청도 STALE_RESERVATION_VERSION을 받을 수 있는데 취소 모달 상태 enum에는 그에 대응할 상태가 없음**.

### 2.2 격리 실험 결과

- BE 세션은 §6.3 취소 에러 목록에 따라 STALE_RESERVATION_VERSION을 정상 반환.
- FE 세션은 02 §7의 9 상태 enum만 보고 매핑 표가 없어 `server_error`로 fallback. UX 저하 (변경 화면처럼 친절한 새로고침 배너 대신 일반 오류).

### 2.3 근본 원인

- 입력 PRD가 §3.5(에러 코드 의미론)와 §3.8(화면 상태 enum) 두 곳에서 **같은 도메인 사실을 서로 다른 시각으로 진술**하고, 그 둘이 1:1 대응되는지를 PRD 작성자가 cross-check 하지 않음.
- 하니스의 `claude-analyzer.md`는 §3.5는 `01 §2.6/§6.3`으로, §3.8은 `02 §7`로 **각각 별도 경로로 옮김**. 두 경로 사이를 비교하지 않음.
- `prompts/codex-validator.md`의 검증 룰 중 **"에러 enum × 화면 상태 enum 의 1:1 매핑 완전성"** 같은 cross-section 룰이 없음.
- `.archive/.../specs/02-conflicts-and-questions.md`에 이 conflict가 등록되지 않음.

### 2.4 수정 방향

#### Option A — analyzer에 자동 cross-mapping 생성 강제

`prompts/claude-analyzer.md`의 `04-screen-state-spec.md` 생성 단계에서, **에러 코드 enum × 화면 상태 enum의 매핑표를 강제로 생성하고 빈 셀이 없는지 검사**하도록 추가:

```
[STEP: error-x-screen-state-mapping]
1. error_codes := 01 §2.9 의 에러 코드 enum (예: 13개)
2. screen_states := 02 §7 의 변경 화면 상태 enum + 취소 모달 상태 enum
3. 각 endpoint 별로 다음 매트릭스를 만든다:
     rows: 해당 endpoint가 반환할 수 있는 에러 코드 (06-openapi.patch.yaml 에서 추출)
     cols: 해당 endpoint가 사용하는 화면 상태 enum
4. 각 row 가 정확히 하나의 col 로 매핑되는지 확인. 매핑 안 되는 row가 있으면:
   - 가장 가까운 fallback 상태를 명시적으로 선택하거나 (예: server_error)
   - 새 상태를 화면 상태 enum 에 추가하도록 02-conflicts-and-questions.md 에 question 등록
5. 매핑표는 01 §7 에 그대로 출력한다 (현재처럼 평탄한 표가 아니라 endpoint × error → state).
```

특히 **취소 endpoint가 반환하는 에러 enum의 모든 항목이 취소 모달 상태 enum에 매핑되는지** 명시적으로 검사.

#### Option B — rules/screen-state-rules.yaml에 covering 룰 추가

`rules/screen-state-rules.yaml`에 다음 룰 추가:

```yaml
- id: error-state-coverage
  description: |
    Every error code returned by an endpoint MUST have a mapping
    to a screen-state enum value used by that endpoint's screen.
    If no mapping exists, either (a) extend the screen-state enum,
    or (b) explicitly map to a fallback state (e.g. server_error),
    or (c) register a conflict in 02-conflicts-and-questions.md.
  applies_to:
    - 04-screen-state-spec.md
    - 02-frontend hand-off (§7 mapping table)
  enforcement:
    - analyzer: must produce endpoint × error → state matrix
    - validator: must detect empty cells
```

#### Option C — codex-validator에 cross-enum coverage 검사

`prompts/codex-validator.md`에 새 룰:

```
[RULE: error-enum-vs-screen-state-coverage]
입력:
  - 01-공통-규칙.md §6.x 의 endpoint 별 에러 enum
  - 02-프론트엔드-작업.md §7 의 화면별 상태 enum
  - 01 §7 의 HTTP→화면 매핑표

검사:
  for each endpoint e:
    errors_e := §6.e 의 에러 코드 집합 (HTTP status + code)
    screen_e := e 가 호출되는 화면의 상태 enum
    mapping  := §7 매핑표의 (error, screen) 룩업

    finding 등록 조건:
      - errors_e 의 어떤 code 도 §7 매핑표에 항목이 없는 경우
      - 매핑된 screen 값이 screen_e 에 속하지 않는 경우 (예: stale_version → 취소 모달이 보유하지 않음)
severity: high
```

#### Option D — 입력 PRD 일관성 사전 검사 (선택적, 강력)

`prompts/claude-analyzer.md` **앞단**에 PRD 자체의 self-consistency 검사 단계를 추가:

```
[PREFLIGHT: prd-self-consistency]
PRD 안에서:
  - 모든 "에러 코드 enum" 진술
  - 모든 "화면 상태 enum" 진술
  - 모든 "동시성/revision/낙관적 락 규칙" 진술
을 추출하고 cross-reference 한다. 동시성 규칙이 모든 mutation endpoint(변경/취소/생성/삭제)에 적용된다는 진술이 있는데 그에 대응할 화면 상태가 일부 enum 에서 누락된 경우 conflict 로 등록.
```

권장: **Option A + Option C 병행**. Option B는 룰 명세 보강. Option D는 비용 대비 효용을 보고 결정.

---

## 3. 부수 권고 (M1/M2에서 함께 드러난 약점)

### 3.1 `02-conflicts-and-questions.md`의 coverage 부족

현재 conflict/question으로 등록된 항목들은 PRD §11 "Open Questions"에 이미 명시된 것들 위주다. **PRD가 미처 자각하지 못한 self-contradiction**은 잡지 못하고 있다.

→ analyzer에 "PRD 명시 OQ ∪ PRD 미인지 self-contradiction" 양쪽을 모두 등록하라고 지시. 특히:
- 같은 도메인 사실의 서로 다른 진술 (M1의 §2.8 vs §6.2 같은 패턴)
- enum 간 1:1 대응 누락 (M2의 패턴)

### 3.2 finalizer 마지막에 cross-document round-trip 검사

`prompts/claude-finalizer.md` 마지막에:

```
[FINAL CHECK: round-trip simulation]
다음을 simulate 한다:
  1. 01 + 02 만 본 FE 개발자가 도출할 수 있는 API 인터페이스 가정 목록 A_fe
  2. 01 + 03 만 본 BE 개발자가 결정할 수 있는 API 인터페이스 contract A_be
A_fe 와 A_be 가 다음 차원에서 모두 일치하는지 확인:
  - endpoint path / method
  - 요청 body 필드 집합
  - 응답 body 필드 집합 (특히 PATCH 처럼 GET 와 비교되는 endpoint)
  - 에러 code × HTTP status
  - 인증 메커니즘
  - 시각/숫자 직렬화 포맷

불일치 항목은 finalizer가 01 본문에 명시적으로 박아야 한다 ("예: revision 은 정수, ISO-8601 UTC, JSON 키는 camelCase").
```

이번 사례에서 격리 실험 자체가 이 round-trip simulation 역할을 했고 M1을 잡아냈다. 하니스가 finalize 단계에서 이걸 LLM 호출 한 번으로 simulate 하면 사전 차단 가능.

### 3.3 직렬화 메타데이터 명시 의무화

이번 격리 실험에서 양측 모두 다음 항목들을 **명세에 없어서 가정으로 메움**:
- JSON 키 케이스 (camelCase vs snake_case)
- 시각 직렬화 포맷 (ISO-8601 with `Z` vs epoch ms)
- `revision` 자료형 (integer vs string)
- availability 응답 wrapper 여부 (`{seats:[]}` vs `[]`)

→ `prompts/claude-finalizer.md` 또는 `claude-analyzer.md`에 **API 계약 섹션 작성 시 위 4종 메타데이터를 반드시 명시**하도록 강제. (이번 사례는 우연히 양측이 같은 가정에 도달했지만 일반적으로 실패할 수 있다.)

---

## 4. 우선순위

| # | 결함 | 수정 | 우선순위 |
|---|---|---|---|
| 1 | M1: 같은 문서 내 §2.8 vs §6.2 모순 | §1.4 Option A (finalizer 일관성 검사) + Option C (validator 룰) | **P0** |
| 2 | M2: 에러 enum × 화면 상태 enum 매핑 누락 | §2.4 Option A (analyzer 매트릭스 강제) + Option C (validator 룰) | **P0** |
| 3 | conflicts.md coverage 부족 | §3.1 | P1 |
| 4 | finalizer round-trip simulation | §3.2 | P1 |
| 5 | 직렬화 메타데이터 명시 의무화 | §3.3 | P2 |

P0 두 건이 들어가면 본 사례에서 발견된 통합 깨짐 2건은 모두 사전 차단된다. 회귀 테스트로 `sbh-test/inputs/test/`를 그대로 다시 돌려 `M1/M2가 재현되지 않는지` 확인할 것을 권장한다.

---

## 5. 회귀 테스트 시나리오 (수정 후 반드시 통과해야 함)

```
입력: /Users/satgym/work/sbh-test/inputs/test/
실행: /spec-boundary-harness:spec-harness test

검증 1 (M1 회귀):
  results/test/01-공통-규칙.md §2.8 의 "변경 성공 응답" 필드 집합이
  §6.2 PATCH 응답 200 의 필드 집합과 일치하는가? 
  (혹은 둘 사이 차이가 명시적 문장으로 박혀 있는가?)

검증 2 (M2 회귀):
  results/test/02-프론트엔드-작업.md §7 의 취소 모달 상태 enum 이
  results/test/01-공통-규칙.md §6.3 의 취소 endpoint 에러 enum 의
  모든 code 를 매핑할 수 있는가?
  특히 STALE_RESERVATION_VERSION 이 취소 모달에서 명시적 매핑(stale_version 또는 fallback)을 받는가?

검증 3 (M3 회귀, 부정적):
  Q1 (403 vs 404) 가 여전히 Open Question 으로 보존되어 있어야 하며,
  하니스가 임의로 한쪽으로 결정해서는 안 된다.
```
