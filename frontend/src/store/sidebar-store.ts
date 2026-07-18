import { create } from 'zustand'

const SIDEBAR_KEY = 'k-vibe-sidebar'

interface SidebarState {
  isCollapsed: boolean
  toggle: () => void
}

const initialCollapsed = localStorage.getItem(SIDEBAR_KEY) === 'true'

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: initialCollapsed,
  toggle: () =>
    set((state) => {
      const next = !state.isCollapsed
      localStorage.setItem(SIDEBAR_KEY, String(next))
      return { isCollapsed: next }
    }),
}))
