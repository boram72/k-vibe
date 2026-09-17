// 2026-09: 원래 blocks/analyze/usage-tutorial.tsx 안에만 있던 헬퍼를 공용으로
// 뺐다 — blocks/route의 "내 루트 비어있을 때" 안내에서도 같은 방식(버튼 이름을
// 실제 버튼처럼 보이는 작은 테두리 박스로 표시)이 필요해져서, 두 군데에서
// 로직이 갈라지면 나중에 한쪽만 고쳐서 조용히 어긋날 수 있어 하나로 합쳤다.
//
// 번역 문자열 안에 버튼 이름을 감싼 표기(따옴표/대괄호/일본어 낫표)를 그대로
// 구분자로 재사용한다 — 언어마다 관용적으로 쓰는 인용부호가 달라서(ko/en은
// '...', zh는 스마트 따옴표 "..."(U+201C/U+201D, 일반 " 아님), ja는 「...」)
// 그 전부를 인식하고, [...]는 공통으로 쓴다. 실제 버튼 스크린샷을 언어별로
// 유지하는 대신 이 방식을 쓴 이유: 문구가 바뀔 때마다 4개 언어 스크린샷을
// 다시 찍어야 하는 유지보수 부담이 없고, 다크모드/테마에도 저절로 맞는다.
const BUTTON_REF_SPLIT = /('[^']+'|“[^”]+”|「[^」]+」|\[[^\]]+\])/g
const BUTTON_REF_TEST = /^('[^']+'|“[^”]+”|「[^」]+」|\[[^\]]+\])$/

// 소문자로 시작하는 일반 함수로 둔다(컴포넌트처럼 보이는 PascalCase가 아님) —
// react-refresh 린트가 "마운트되는 컴포넌트로 보이는 함수"를 발견하면 이 파일이
// 컴포넌트만 export해야 한다고 요구하는데, 이건 renderStepText 내부에서만 쓰는
// JSX 조각일 뿐 실제로 마운트되는 컴포넌트가 아니라서 그 취급을 피한다.
function buttonChip(key: number, children: string) {
  return (
    <span key={key} className="mx-0.5 inline-flex items-center rounded-md border border-border bg-background px-1.5 py-0.5 align-middle text-[11px] font-semibold text-foreground shadow-sm">
      {children}
    </span>
  )
}

export function renderStepText(text: string) {
  return text
    .split(BUTTON_REF_SPLIT)
    .map((part, idx) => (BUTTON_REF_TEST.test(part) ? buttonChip(idx, part.slice(1, -1)) : <span key={idx}>{part}</span>))
}
