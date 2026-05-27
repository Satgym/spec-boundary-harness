import path from "node:path";
import { ensureDir, exists, writeText } from "../util/fs.js";
import { folderNameToFeatureId } from "./detect.js";

const PRD_TEMPLATE = `# PRD — __FEATURE__

작성자:
상태: 초안 (작성 중)

> 이 문서에 적힌 내용은 **반드시 지킬 사항**입니다. 정해지지 않은 것은 적지 마세요 — \`proposal\` 또는 \`open question\`으로 분리합니다.
> 회의록 / API 초안 / UI 노트 같은 자유 형식 자료는 \`inputs/__FEATURE__/\` 직속에 아무 이름 \`.md\` 파일로 평평하게 두면 됩니다. Claude가 내용을 보고 자동 분류합니다.

## 1. 목적

(이 기능이 무엇을 하는지 한 문단으로.)

## 2. v1 확정 범위

- (확정 사항 1)
- (확정 사항 2)

## 3. 화면

- 화면 진입 경로:
- 모달인지 별도 페이지인지:

## 4. 상태 (화면 상태 목록)

- initial
- loading
- success
- validation_error
- permission_denied
- network_error
- (그 외 feature 특화 상태)

## 5. API

- 메소드 / 경로 / 인증 필요 여부:
- request body 요약:
- 응답 코드 (200 / 4xx / 5xx) + 각 코드의 의미:

## 6. proposal (v1 확정 아님)

(v1엔 안 들어가지만 도입 검토 중인 항목. 정책 미정인 것들.)

- (proposal 1)

## 7. 미정 사항 (open question)

(보안팀 / 법무팀 등 외부 결정 필요. 일정 미정.)

- (open question 1)

## 8. 범위 외 (다른 feature)

(명시적으로 본 feature 범위 외인 것. 어디서 다루는지 명시.)

- (범위 외 1)
`;

export interface SetupResult {
  bundleDir: string;
  featureId: string;
  createdPrd: boolean;
  alreadyExisted: boolean;
}

export async function setupCommand(
  rootDir: string,
  rawFeatureId: string
): Promise<SetupResult> {
  if (!rawFeatureId) {
    throw new Error("featureId required (usage: spec-harness setup <featureId>)");
  }
  const featureId = folderNameToFeatureId(rawFeatureId);
  const bundleDir = path.join(rootDir, "inputs", featureId);
  const prdDir = path.join(bundleDir, "prd");
  const prdFile = path.join(prdDir, "기획서.md");

  await ensureDir(prdDir);

  const alreadyExisted = await exists(prdFile);
  let createdPrd = false;
  if (!alreadyExisted) {
    await writeText(prdFile, PRD_TEMPLATE.replace(/__FEATURE__/g, featureId));
    createdPrd = true;
  }

  // Stable, user-facing output. The slash command relays this to Claude
  // which then summarises it to the user.
  const relBundle = path.relative(rootDir, bundleDir) || `inputs/${featureId}`;
  if (createdPrd) {
    console.log(`setup: created ${relBundle}/prd/기획서.md`);
  } else {
    console.log(`setup: ${relBundle}/prd/기획서.md 가 이미 존재합니다 — 그대로 둡니다.`);
  }
  console.log("");
  console.log("다음 순서로 진행하세요:");
  console.log(`  1. ${relBundle}/prd/기획서.md 를 열어 '반드시 지킬 사항'을 채우세요.`);
  console.log(`  2. 회의록 / 요약 / API 초안 / UI 노트 같은 자유 자료는`);
  console.log(`     ${relBundle}/ 직속에 자유로운 이름의 .md 파일로 두세요. (한국어 파일명 OK)`);
  console.log("     예: 킥오프-회의록.md, 회의-요약.md, api-초안.md, ui-디자인-노트.md");
  console.log("  3. /spec-boundary-harness:spec-harness 로 실행하세요.");

  return { bundleDir, featureId, createdPrd, alreadyExisted };
}
