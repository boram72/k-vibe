import { create } from 'zustand'

interface TourState {
  activeTourKey: string | null
  stepIndex: number
  start: (key: string) => void
  next: (totalSteps: number) => void
  close: () => void
  optOut: () => void
}

const SEEN_KEY_PREFIX = 'k-vibe-tour-seen-'
const OPTOUT_KEY = 'k-vibe-tour-optout'
const VISIT_RESOLVED_KEY = 'k-vibe-tour-visit-resolved'

// localStorage가 막혀있는 환경(프라이빗 모드 등)에서도 튜토리얼이 계속 억지로
// 뜨는 것보다는, 이미 본 것으로 취급해서 아예 안 뜨는 쪽이 덜 거슬린다.
export function hasSeenTour(key: string): boolean {
  try {
    return localStorage.getItem(SEEN_KEY_PREFIX + key) === '1'
  } catch {
    return true
  }
}

export function markTourSeen(key: string) {
  try {
    localStorage.setItem(SEEN_KEY_PREFIX + key, '1')
  } catch {
    // no-op — 저장 실패해도 이번 세션 안에서 튜토리얼 자체는 정상 동작
  }
}

export function isOptedOut(): boolean {
  try {
    return localStorage.getItem(OPTOUT_KEY) === '1'
  } catch {
    return true
  }
}

// "다시 보지 않기" — 이번 방문 안에서도 남은 다른 메뉴 투어를 전부 즉시 끄고,
// 다음 접속부터도 영구히 안 뜨게 한다. WelcomeGate(홈 진입 전 안내창)에서도
// 같은 의미로 쓰이므로 store 액션과 별개로 직접 호출할 수 있게 export한다.
export function optOutOfTours() {
  try {
    localStorage.setItem(OPTOUT_KEY, '1')
    localStorage.setItem(VISIT_RESOLVED_KEY, '1')
  } catch {
    // no-op
  }
}

// 홈 투어와 한 번이라도 상호작용(완료/닫기/다시보지않기)했음을 표시한다 —
// "다음 접속부터"만 전체 투어를 끄기 위한 신호이고, 이번 방문 도중의 다른
// 메뉴 첫 진입 투어에는 영향을 주지 않는다(캡처된 스냅샷을 쓰는
// canAutoStartTour 참고).
export function resolveVisit() {
  try {
    localStorage.setItem(VISIT_RESOLVED_KEY, '1')
  } catch {
    // no-op
  }
}

// 이번 페이지 로드(세션) 시작 시점에 "첫 방문이 이미 끝난 상태였는지"를 딱
// 한 번만 읽어서 모듈 스코프에 고정해둔다. 세션 도중 홈 투어가 완료/닫기로
// 끝나서 저장값이 true로 바뀌어도 이 스냅샷은 그대로라서, 이번 방문 안에서는
// 다른 메뉴의 첫 진입 투어가 계속 뜬다 — "다음 접속부터만" 전체가 꺼져야
// 하기 때문(사용자 요청 플로우: 닫기 클릭 시에도 이번 방문 중엔 다른 메뉴
// 투어가 계속 뜨고, 다음 접속부터만 안 뜨게).
const wasVisitResolvedAtLoad = (() => {
  try {
    return localStorage.getItem(VISIT_RESOLVED_KEY) === '1'
  } catch {
    return true
  }
})()

// 페이지 진입 시 자동으로 투어를 띄워도 되는지 — "다시 보지 않기"는 이번
// 세션 안에서도 즉시 막아야 해서 매번 다시 읽고(isOptedOut), "첫 방문이 이미
// 끝났는지"는 세션 시작 시점 스냅샷(wasVisitResolvedAtLoad)을 쓴다.
export function canAutoStartTour(key: string): boolean {
  return !isOptedOut() && !wasVisitResolvedAtLoad && !hasSeenTour(key)
}

export const useTourStore = create<TourState>((set, get) => ({
  activeTourKey: null,
  stepIndex: 0,
  start: (key) => set({ activeTourKey: key, stepIndex: 0 }),
  next: (totalSteps) => {
    const { stepIndex, activeTourKey } = get()
    const nextIndex = stepIndex + 1
    if (nextIndex >= totalSteps) {
      if (activeTourKey) markTourSeen(activeTourKey)
      resolveVisit()
      set({ activeTourKey: null, stepIndex: 0 })
    } else {
      set({ stepIndex: nextIndex })
    }
  },
  // 말풍선 우상단 "X" — 이번 투어만 닫는다. 다른 메뉴의 첫 진입 투어는 이번
  // 방문 안에서는 계속 뜨고, 다음 접속부터만 전체가 꺼진다(사용자 요청).
  close: () => {
    const { activeTourKey } = get()
    if (activeTourKey) markTourSeen(activeTourKey)
    resolveVisit()
    set({ activeTourKey: null, stepIndex: 0 })
  },
  // "다시 보지 않기" — 이번 방문 중 남은 다른 메뉴 투어도 즉시 다 끄고,
  // 다음 접속부터도 영구히 안 뜨게 한다.
  optOut: () => {
    const { activeTourKey } = get()
    if (activeTourKey) markTourSeen(activeTourKey)
    optOutOfTours()
    set({ activeTourKey: null, stepIndex: 0 })
  },
}))
