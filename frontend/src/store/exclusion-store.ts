import { create } from 'zustand'

// 결과 화면(SNS 분석기·페르소나)에서 사용자가 "선택해제"로 뺀 카드 목록을 화면 밖에 보관한다.
//
// 이 상태를 화면 컴포넌트의 useState에만 두면, 지도 아이콘으로 지도에 갔다가 "돌아가기"로
// 돌아왔을 때(페이지가 새로 만들어짐) 제외 상태가 사라져 뺐던 장소가 다시 선택된 채로
// 보였다 — 그대로 "루트에 추가"를 누르면 뺀 장소가 들어가는 문제. 여기 두면 화면을 떠났다
// 돌아와도 유지된다.
//
// scope는 "화면:대상"으로 짓는다(예: `analyze:<videoId>`, `persona:<personaId>`). 메모리에만
// 있어서 새로고침하면 사라지고, 비우는 시점은 각 화면이 정한다(새 분석/초기화 등).
interface ExclusionState {
  excluded: Record<string, string[]>
  toggle: (scope: string, id: string) => void
  clear: (scope: string) => void
  clearPrefix: (prefix: string) => void
}

// 제외한 게 없을 때 매번 새 빈 배열을 만들면 셀렉터 결과가 매 렌더 달라 보이므로 하나를 공유한다.
export const EMPTY_EXCLUDED: readonly string[] = []

function withoutKeys(record: Record<string, string[]>, shouldDrop: (key: string) => boolean) {
  const next: Record<string, string[]> = {}
  for (const key of Object.keys(record)) {
    if (!shouldDrop(key)) next[key] = record[key]
  }
  return next
}

export const useExclusionStore = create<ExclusionState>((set) => ({
  excluded: {},
  toggle: (scope, id) =>
    set((state) => {
      const current = state.excluded[scope] ?? []
      const next = current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id]
      return { excluded: { ...state.excluded, [scope]: next } }
    }),
  clear: (scope) =>
    set((state) => (scope in state.excluded ? { excluded: withoutKeys(state.excluded, (key) => key === scope) } : state)),
  clearPrefix: (prefix) =>
    set((state) =>
      Object.keys(state.excluded).some((key) => key.startsWith(prefix))
        ? { excluded: withoutKeys(state.excluded, (key) => key.startsWith(prefix)) }
        : state,
    ),
}))
