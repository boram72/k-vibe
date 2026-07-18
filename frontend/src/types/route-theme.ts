export const ROUTE_THEMES = ['kpop', 'drama', 'mood', 'foodie', 'creator', 'history'] as const
export type RouteTheme = (typeof ROUTE_THEMES)[number]

export interface RouteThemeOption {
  id: RouteTheme
  badge: string
  detailIds: string[]
}

// Single source of truth for theme/detail taxonomy — add/remove a theme here only.
// Labels/descriptions live in messages/*.json under `persona.themes.*`.
export const ROUTE_THEME_OPTIONS: RouteThemeOption[] = [
  { id: 'kpop', badge: 'KPOP', detailIds: ['bts', 'blackpink', 'newjeans', 'aespa'] },
  { id: 'drama', badge: 'TV', detailIds: ['palace', 'romance', 'street_food', 'night'] },
  { id: 'mood', badge: 'MOOD', detailIds: ['cafe', 'photo', 'healing', 'food'] },
  { id: 'foodie', badge: 'FOOD', detailIds: ['market', 'dessert', 'night_food', 'local_table'] },
  { id: 'creator', badge: 'SHOT', detailIds: ['reels', 'fashion', 'design', 'night_shot'] },
  { id: 'history', badge: 'HIST', detailIds: ['palace_day', 'hanok_walk', 'museum', 'heritage_food'] },
]

export function getRouteThemeOption(theme: RouteTheme): RouteThemeOption {
  return ROUTE_THEME_OPTIONS.find((option) => option.id === theme)!
}
