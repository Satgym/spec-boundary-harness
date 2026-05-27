# Autonomous Improvement Loop — Final Report

Generated: 2026-05-28
Initiated by: user request "자율적으로 round 반복 + codex 검증 + 백그라운드 병렬 세션 활용"

## 한 줄 결론

**v0.6.0의 cross-section consistency 가드가 두 도메인에서 모두 의도대로 동작 (총 26/26 contract items aligned, 0 critical divergence). 진짜 결함은 모두 하니스의 packaging / path 계층에서 발견됐고 v0.6.1·v0.6.2로 fix.**

---

## 진행 요약

| Round | 도메인 | 입력 | Codex finding (R1 1차) | FE/BE 정합 | 비고 |
|---|---|---|---|---|---|
| 1 | comment.post (게시글 댓글) | PRD + 회의록 + API 초안 + UI 노트 | 3건 (critical 1, high 2) | **12/12 정합** | OT-01이 critical 하니스 버그 발견 |
| 2 | payment.checkout (카드 결제) | 동일 layout | 0건 | **14/14 정합** | PCI-DSS, idempotency, 금액 위·변조 모두 정합 |

각 round 전체 흐름:
1. 입력 자료 생성 (4 파일, 보안 자극 포함)
2. Phase 1 — analyzer 11 spec 작성 (PREFLIGHT + STEP 8/9 적용)
3. Phase 2 — codex validate (real Codex CLI 호출, schema 강제)
4. Phase 3 — 한국어 3 hand-off 문서 + 자동 archive
5. Agent tool로 격리된 **FE / BE 백그라운드 세션 병렬** 코딩
6. SUMMARY.md 정합 비교 + spec gap 패턴 추출

## v0.6.0 가드 실제 작동 검증

### PREFLIGHT prd-self-consistency
- ✅ Round 1: PRD 화면 상태 enum 8개와 API 404 post_not_found 사이의 누락된 매핑을 conflict-1로 자동 발견. fallback (network_error) 채택 + 인간 확인 표시.
- ✅ Round 2: 본 도메인에는 self-contradiction 없음. preflight가 "(none)" 정확히 보고.

### STEP 8 — endpoint × error → state matrix
- ✅ Round 1: 8 row 모두 매핑됨, 빈 셀 없음 (404는 fallback 명시).
- ✅ Round 2: 9 row 모두 매핑됨 (401 → network_error fallback, 404 → amount_mismatch fallback, 409 → submitting + auto-retry).
- 두 round 모두 FE/BE가 매핑표 row-for-row 구현.

### STEP 9 — 직렬화 메타데이터
- ✅ Round 1: snake_case / ISO-8601 UTC Z / string ULID
- ✅ Round 2: snake_case / ISO-8601 UTC Z / int KRW / UUID v4
- 두 round 모두 FE/BE가 같은 직렬화 결정 사용.

### codex-validator critical/high만 보고
- Round 1 (v0.6.1 fix 전): 3건 모두 critical/high. medium/low 0건. ✅
- Round 2 (v0.6.1 fix 후): **0건**. ✅

### 자동 archive
- ✅ 두 round 모두 specs/ + reports/ → .archive/<feature>-<ts>/ 정상.

## 발견된 하니스 결함 (모두 fix됨)

### v0.6.1 — codex-validate path 혼용 (CRITICAL)

Round 1에서 발견. 하니스를 실제 user project에서 처음 호출했을 때 노출.

- **버그 A**: `validate.ts:42`가 `<userProject>/scripts/codex-validate.sh`를 찾음. 그 스크립트는 plugin install 위치에 있음.
  - **Fix**: import.meta.url로 CLI 모듈 위치 기준 resolve.

- **버그 B**: `codex-validate.sh:16`이 `ROOT_DIR`을 plugin (prompts/schemas) + project (reports) 양쪽 용도로 혼용.
  - **Fix**: `PLUGIN_ROOT` (스크립트 부모) + `PROJECT_ROOT` (`$ROOT_DIR`) 분리.

- **버그 C** (OT-01): codex-validator.md가 profiles/rules를 user project에서 찾음. user project엔 없음.
  - **Fix**: `codex-validate.sh`의 USER_BODY에 `$PLUGIN_ROOT` 명시 + "user project에 없는 게 정상" 문구 추가.

이 셋 모두 plugin install 흐름 안 거치고 marketplace repo에서만 테스트했기 때문에 안 잡혔던 버그. 자율 round가 처음으로 진짜 user 흐름을 만들어 노출.

### v0.6.2 — tsx packaging (META-02 from meta-review)

`tsx`가 devDependencies라 production install (`npm install --omit=dev`) 시 빠짐. wrapper script의 lazy `npm install`은 devDeps 함께 받지만 직접 호출 흐름은 깨짐.

- **Fix**: `tsx`를 `dependencies`로 이동.

## 발견된 spec gap 패턴 (input 결함, 하니스가 잡지 않은 부분)

두 round 모두 양쪽 agent가 noticed:

| Round | 미명시 항목 | FE 자체 결정 | BE 자체 결정 | 통합 영향 |
|---|---|---|---|---|
| 1 | `author_name` 출처 | placeholder 후 서버 응답 덮어쓰기 | token tail 도출 (mock) | 우연히 호환, 일반적 위험 |
| 2 | `decline_reason` enum 값 | server message 그대로 사용 | `insufficient_funds` 같은 string 자체 결정 | 호환 |
| 2 | `cart_locked` 재시도 정책 | 3회 × 200ms 자체 채택 | server lock + finally 해제 | 호환 |
| 2 | success toast 타이밍 | page layer에 위임 | (BE 무관) | 호환 |

이건 PRD/API 노트가 명시하지 않은 implementation detail. 두 격리 세션이 운 좋게 호환됐지만 일반적으로 위험.

**하니스에 추가 가드 도입 평가 결과: 보류**

- Option: claude-analyzer.md에 "응답 필드 출처 / enum 값 출처 검증" STEP 추가
- 비용: prompt가 더 길어짐 (사용자 명시 요청 위배 — "정말 필요한 내용만 남겨")
- 가치: 두 round 시뮬레이션에서 실제 통합 깨짐 0건. 가설적 위험.
- 결정: **추가 안 함**. round 더 진행해서 실제로 통합 깨지는 케이스가 나오면 그때 추가.

## 하니스 prompt 길이 평가

사용자 명시: "하니스는 결국 너무 길어질 경우 클로드가 모든 내용을 자세히 확인하지 않을 수 있기 때문에 정말 필요한 내용들만 남겨 지켜질 수 있도록 해야하고."

v0.6.0에서 추가된 가드 (PREFLIGHT, STEP 8/9, CHECK들)가 두 round 모두 의도대로 작동. 두 round의 0 critical divergence가 강한 증거. 추가 가드는 비용 대비 가치 불명확.

**v0.6.0 이후로 prompt에 더 추가하지 않음**이 현 시점 권장.

## 자율 round의 다음 활용 방향

본 round에서 발견된 패턴을 사용자가 자고 일어난 뒤 직접 확인 / 검증 가능:

1. `/tmp/sbh-autorun-1/results/comment.post/` — comment.post 한국어 3문서
2. `/tmp/sbh-autorun-1/fe-impl/`, `be-impl/` — Round 1 격리 FE/BE 코드
3. `/tmp/sbh-autorun-2/results/payment.checkout/` — payment.checkout 한국어 3문서
4. `/tmp/sbh-autorun-2/fe-impl/`, `be-impl/` — Round 2 격리 FE/BE 코드

각 SUMMARY.md가 직접 비교 가능한 형태.

## Git 변경 사항

```
v0.6.0 → v0.6.1: codex-validate path fix (3개 경로 버그)
v0.6.1 → v0.6.2: tsx packaging fix (production install 보장)
```

추가 tag 둘 다 push. CHANGELOG.md에 각 버전 entry.

## 권고 — 사용자가 자고 일어난 뒤

### 즉시 가치 (5분)
- Manage Plugins → Marketplaces → Update → Install로 v0.6.2 받기 (자동 fix 두 개 반영)
- /tmp/sbh-autorun-1/, /tmp/sbh-autorun-2/의 SUMMARY 비교해서 정합 패턴 직접 확인

### 중기 (round 3+로 가치 검증)
- 자율 round를 5-10회 더 돌리면 implementation-detail spec gap (decline_reason, cart_locked retry 같은)이 실제로 통합 깨지는 케이스가 발생하는지 통계적 확인 가능
- 발생하면 그때 analyzer에 "응답 필드 / enum 출처 검증" STEP 추가 가치

### 장기 (관찰 사항)
- v0.6.0 cross-section 가드가 두 도메인에서 강하게 작동. 더 다양한 도메인 (multi-screen, real-time, batch ops)에서도 같은 강도인지는 추가 round 필요.
- META-08 (test coverage 강화), META-11 (`generated_at` format-date-time enforcement) 같은 meta-review medium은 prompt 부담 없이 가능. 별도 일정 시.
