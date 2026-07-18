import { create } from 'zustand'
import { readRouteProgress, saveRouteProgress } from '@/lib/route-progress'

interface RouteProgressState {
  completedIds: Set<string>
  toggleComplete: (id: string) => void
  removeStop: (id: string) => void
  clear: () => void
}

// Lifted out of RoutePage's local state so RoutePage and ProfilePage's
// current-route-card can both read/toggle the same completion state and stay
// in sync — same localStorage-backed pattern as sidebar-store/theme-store,
// just reactive across pages instead of page-local useState.
export const useRouteProgressStore = create<RouteProgressState>((set, get) => ({
  completedIds: readRouteProgress(),
  toggleComplete: (id) => {
    const next = new Set(get().completedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    saveRouteProgress(next)
    set({ completedIds: next })
  },
  removeStop: (id) => {
    const next = new Set(get().completedIds)
    next.delete(id)
    saveRouteProgress(next)
    set({ completedIds: next })
  },
  clear: () => {
    saveRouteProgress(new Set())
    set({ completedIds: new Set() })
  },
}))
