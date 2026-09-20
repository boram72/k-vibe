import { create } from 'zustand'

// 2026-09 버그 수정 — 페르소나 결과 화면(route-result.tsx)의 스팟 제외 선택은
// 원래 그 컴포넌트 안에서만 사는 로컬 state였다. "지도에서 보기"/"지도에서
// 모두 보기"로 /map(다른 라우트)에 다녀오면 PersonaPage 전체가 언마운트됐다
// 재마운트되면서 선택이 항상 초기화되던 버그(사용자 리포트로 확인) — 같은
// 문제를 이미 겪었던 AnalyzePage의 analyze-store.ts와 동일하게, 화면 로컬
// state 대신 이 세션 메모리 store로 옮겨서 라우트 왕복에도 유지되게 한다.
// 새로고침 시엔 초기화(다른 store들과 동일, 영속 저장 아님).
interface PersonaSelectionState {
  personaId: string | null
  excludedIds: Set<string>
  // personaId가 이전과 다르면(다른 페르소나 결과로 전환) 빈 집합에서부터
  // 다시 시작 — 같은 페르소나로 돌아온 경우에만 기존 선택을 이어간다.
  toggleStop: (personaId: string, stopId: string) => void
  // "다른 루트 만들기"(↻)는 처음부터 다시 시작하는 동작이라 제외 선택도 비운다 — 같은 페르소나를 다시
  // 골라도 이전 제외가 남지 않게. 지도 왕복·언어 전환에서는 호출하지 않으므로 그때는 그대로 유지된다.
  clear: () => void
}

export const usePersonaSelectionStore = create<PersonaSelectionState>((set, get) => ({
  personaId: null,
  excludedIds: new Set(),
  toggleStop: (personaId, stopId) => {
    const state = get()
    const base = state.personaId === personaId ? state.excludedIds : new Set<string>()
    const next = new Set(base)
    if (next.has(stopId)) next.delete(stopId)
    else next.add(stopId)
    set({ personaId, excludedIds: next })
  },
  clear: () => set({ personaId: null, excludedIds: new Set() }),
}))
