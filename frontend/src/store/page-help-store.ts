import { create } from 'zustand'

interface PageHelpState {
  title: string | null
  body: string | null
  setHelp: (title: string, body: string) => void
  clearHelp: () => void
}

export const usePageHelpStore = create<PageHelpState>((set) => ({
  title: null,
  body: null,
  setHelp: (title, body) => set({ title, body }),
  clearHelp: () => set({ title: null, body: null }),
}))
