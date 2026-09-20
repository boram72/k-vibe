import { create } from 'zustand'

interface PageHelpState {
  title: string | null
  body: string | null
  setHelp: (title: string, body: string) => void
  clearHelp: () => void
  // false면 헤더 "?"(튜토리얼) 버튼을 잠근다 — 지도처럼 화면이 다 준비되기 전에는
  // 튜토리얼이 가리킬 요소가 없어서, 눌러도 어두운 배경 위에 말풍선만 덩그러니
  // 뜬다(사용자 지적). 기본값 true(대부분 페이지는 바로 준비됨).
  tourReady: boolean
  setTourReady: (ready: boolean) => void
  // 지금 화면 상태가 튜토리얼이 가리킬 화면이 아닐 때(예: SNS 분석 결과/페르소나
  // 루트 결과 화면) 페이지가 "처음 화면으로 되돌리는 함수"를 등록한다. 등록돼
  // 있으면 "?"를 눌렀을 때 바로 튜토리얼을 띄우지 않고 "초기화 후 진행할까요?"를
  // 먼저 묻는다 — 확인하면 이 함수를 호출한 뒤 튜토리얼을 시작한다.
  tourResetAction: (() => void) | null
  setTourResetAction: (action: (() => void) | null) => void
  // 화면이 "닫혀 있어서" 튜토리얼이 가리킬 요소가 안 보일 때(예: 지도의 접힌/최소화된
  // 패널) 페이지가 "그 화면을 펼치는 함수"를 등록한다. "?"를 누르면 튜토리얼을 시작하기
  // 직전에 이 함수를 호출한다 — 안 그러면 대상이 없어서 튜토리얼이 보이지 않은 채로
  // 대기만 해서 눌러도 아무 반응이 없는 것처럼 보인다. 초기화 안내(위)와 달리 묻지 않고
  // 바로 펼친다(잃는 상태가 없으므로).
  tourPrepareAction: (() => void) | null
  setTourPrepareAction: (action: (() => void) | null) => void
}

export const usePageHelpStore = create<PageHelpState>((set) => ({
  title: null,
  body: null,
  setHelp: (title, body) => set({ title, body }),
  // title/body만 지운다 — 언어를 바꾸면 페이지의 setHelp 이펙트가 cleanup(=clearHelp)->
  // 재실행되는데, 여기서 아래 튜토리얼 상태까지 지우면 다시 등록해 줄 이펙트가 없어서 잠금/
  // 초기화 안내가 풀려버린다. 튜토리얼 상태는 각 페이지가 자기 이펙트 cleanup에서 되돌린다.
  clearHelp: () => set({ title: null, body: null }),
  tourReady: true,
  setTourReady: (ready) => set({ tourReady: ready }),
  tourResetAction: null,
  setTourResetAction: (action) => set({ tourResetAction: action }),
  tourPrepareAction: null,
  setTourPrepareAction: (action) => set({ tourPrepareAction: action }),
}))
