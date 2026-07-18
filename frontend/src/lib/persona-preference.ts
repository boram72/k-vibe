import { ROUTE_THEME_OPTIONS, type RouteTheme } from '@/types/route-theme'
import type { PlaceCategory } from '@/types/place'

const STORAGE_KEY = 'k-vibe-persona-preference'

export interface PersonaPreference {
  theme: RouteTheme
  detail: string
  updatedAt: string
}

function isRouteDetailForTheme(theme: RouteTheme, detail: string): boolean {
  return ROUTE_THEME_OPTIONS.find((option) => option.id === theme)?.detailIds.includes(detail) ?? false
}

export function savePersonaPreference(theme: RouteTheme, detail: string) {
  const preference: PersonaPreference = { theme, detail, updatedAt: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preference))
}

export function readPersonaPreference(): PersonaPreference | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersonaPreference>
    if (typeof parsed.theme !== 'string' || typeof parsed.detail !== 'string') return null
    if (!isRouteDetailForTheme(parsed.theme as RouteTheme, parsed.detail)) return null
    return parsed as PersonaPreference
  } catch {
    return null
  }
}

// Detail-level mapping takes priority over theme-level (e.g. mood+food -> food
// even though the mood theme itself maps to culture) — ported from hslee's
// lib/persona-preference.ts getPersonaFeedCategory.
const THEME_FEED_CATEGORY: Record<RouteTheme, PlaceCategory> = {
  kpop: 'fun',
  drama: 'culture',
  mood: 'culture',
  foodie: 'food',
  creator: 'photo',
  history: 'culture',
}

const DETAIL_FEED_CATEGORY: Record<string, PlaceCategory> = {
  food: 'food',
  street_food: 'food',
  market: 'food',
  dessert: 'food',
  night_food: 'food',
  local_table: 'food',
  photo: 'photo',
  reels: 'photo',
  fashion: 'photo',
  design: 'photo',
  night_shot: 'photo',
}

export function getPersonaFeedCategory(preference: PersonaPreference): PlaceCategory {
  return DETAIL_FEED_CATEGORY[preference.detail] ?? THEME_FEED_CATEGORY[preference.theme]
}
