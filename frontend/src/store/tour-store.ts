import { create } from 'zustand'

interface TourState {
  activeTourKey: string | null
  stepIndex: number
  start: (key: string) => void
  next: (totalSteps: number) => void
  skip: () => void
}

const SEEN_KEY_PREFIX = 'k-vibe-tour-seen-'

// localStorage가 막혀있는 환경(프라이빗 모드 등)에서도 튜토리얼이 계속 억지로
// 뜨는 것보다는, 이미 본 것으로 취급해서 아예 안 뜨는 쪽이 덜 거슬린다.
export function hasSeenTour(key: string): boolean {
  try {
    return localStorage.getItem(SEEN_KEY_PREFIX + key) === '1'
  } catch {
    return true
  }
}

function markTourSeen(key: string) {
  try {
    localStorage.setItem(SEEN_KEY_PREFIX + key, '1')
  } catch {
    // no-op — 저장 실패해도 이번 세션 안에서 튜토리얼 자체는 정상 동작
  }
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
      set({ activeTourKey: null, stepIndex: 0 })
    } else {
      set({ stepIndex: nextIndex })
    }
  },
  skip: () => {
    const { activeTourKey } = get()
    if (activeTourKey) markTourSeen(activeTourKey)
    set({ activeTourKey: null, stepIndex: 0 })
  },
}))
