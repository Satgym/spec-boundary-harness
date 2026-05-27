# Codex Triage — auth.login

Source: `reports/codex-validation-report.md` (generated 2026-05-27T09:50:15+09:00)
Validator pass: real Codex `--sandbox read-only`, schema-enforced JSON output.
Validator counts: critical=0, high=0, medium=2, low=0.

## Accepted findings (applied in this loop)

| id | validator | severity | finding | action taken |
|---|---|---|---|---|
| SC-01 | source-coverage | medium | L3 항목들(token issuance, domain-error mapping 등)이 03-boundary-map.yaml에서 source_refs/requirement-id 백킹 없이 나열됨 | `03-boundary-map.yaml`의 L3와 L4 항목에 각각 requirement id 또는 source 라인을 인용. 출처가 없던 항목(토큰 발급, 자격증명 저장소 조회, 감사 로그)은 명시적으로 `assumption` 표시. |
| SSC-01 | screen-state-coverage | medium | OpenAPI는 400/500 응답을 정의하는데 login_screen 상태 리스트에 invalid_input과 server_error가 없음 | `04-screen-state-spec.md`에 `invalid_input`과 `server_error` 상태 추가 + UI 표시 정의. 변경 사유를 본 트리아지 ID와 연결. |

## Rejected findings

(none)

## Needs human decision

(none — 두 finding 모두 안전한 로컬 수정으로 해소됨)

## Notes

- Codex가 두 번의 `invalid_json_schema` 에러를 거쳐 정상 동작했다. 원인은 OpenAI 구조화 출력 모드가 모든 `properties`를 `required`에 포함시키도록 요구하기 때문. `schemas/codex-validation-report.schema.json`을 strict 모드 호환으로 수정 후 두 번째 시도에서 schema-valid한 JSON을 반환.
- Codex는 본 패킷이 `Status: BLOCKED`임을 별도 finding으로 문제 삼지 않았다. 미해결 high-severity 충돌(Kakao 범위) + 프롬프트 인젝션 보안 경고가 모두 `02-conflicts-and-questions.md`에 반영되어 있고 양쪽 패킷에 blocking reason으로 인용되어 있어 `conflict-blocking` 룰을 만족한다.
- `prompt-injection` validator도 별도 finding을 만들지 않았다. 녹취록의 인젝션 문구는 보안 경고로만 분류되어 어떤 요구사항/패킷에도 인용되지 않은 상태.
- 모든 안전 fix를 적용한 후 두 번째 검증 패스를 돌릴 예정. 결과는 `reports/codex-validation-report.md` (덮어쓰기됨)와 `reports/final-report.md`에서 확인 가능.
