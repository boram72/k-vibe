import { ROUTE_THEME_OPTIONS, type RouteTheme } from '@/types/route-theme'
import type { PlaceCategory } from '@/types/place'
import { syncImmediately } from '@/lib/db-sync'

const STORAGE_KEY = 'k-vibe-persona-preference'

export interface PersonaPreference {
  theme: RouteTheme
  detail: string
  updatedAt: string
}

function isRouteDetailForTheme(theme: RouteTheme, detail: string): boolean {
  return ROUTE_THEME_OPTIONS.find((option) => option.id === theme)?.detailIds.includes(detail) ?? false
}

// [파일 전체 미사용, 2026-09 서비스 컨셉 변경(PR #11) + 프로필 페르소나 뱃지
// 삭제] 이 함수를 호출하던 PersonaPage의 테마/디테일 위저드가 K-콘텐츠 셀럽
// 선택 방식으로 대체되며 호출부가 사라졌음. readPersonaPreference()도 마지막
// 남은 호출부(profile-header.tsx의 페르소나 뱃지)가 제거되면서 이제 남은
// 호출부가 home-feed.tsx/persona-chip.tsx뿐인데 그 둘도 이미 미사용 —
// 즉 이 파일은 이제 읽기/쓰기 둘 다 완전히 죽어있음. 원복 시 write는 새
// 위저드/피커 어딘가에, read는 되살릴 UI 어딘가에 다시 연결하면 됨.
export function savePersonaPreference(theme: RouteTheme, detail: string) {
  const preference: PersonaPreference = { theme, detail, updatedAt: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preference))
  // See DB_INTEGRATION_REQUEST.md — only changes once per wizard completion,
  // so there's nothing to batch.
  syncImmediately('/persona-preference', { theme, detail })
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
