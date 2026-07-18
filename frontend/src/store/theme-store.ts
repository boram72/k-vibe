import { create } from 'zustand'

export type Theme = 'light' | 'dark' | 'auto'
export type ResolvedTheme = 'light' | 'dark'

const THEME_KEY = 'k-vibe-theme'

function resolveAutoTheme(): ResolvedTheme {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 19 ? 'light' : 'dark'
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'auto' ? resolveAutoTheme() : theme
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', resolved)
}

interface ThemeState {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const initialTheme = (localStorage.getItem(THEME_KEY) as Theme | null) ?? 'auto'
const initialResolved = resolveTheme(initialTheme)
applyTheme(initialResolved)

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  resolvedTheme: initialResolved,
  setTheme: (theme) => {
    const resolved = resolveTheme(theme)
    localStorage.setItem(THEME_KEY, theme)
    applyTheme(resolved)
    set({ theme, resolvedTheme: resolved })
  },
}))
