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

// [쓰기 경로만 미사용, 2026-09 서비스 컨셉 변경(PR #11)] 이 함수를 호출하던
// PersonaPage의 테마/디테일 위저드가 K-콘텐츠 셀럽 선택 방식으로 대체되며 호출부가
// 사라졌음 — 신규 유저는 이 함수가 다시는 호출되지 않아 홈피드 개인화 칩
// (persona-chip.tsx, 이것도 현재 미사용)이 영구 비활성 상태. 반대로
// readPersonaPreference()는 profile-header.tsx가 여전히 읽고 있어 살아있고,
// 예전에 이미 저장해둔 값이 있던 기존 유저에게는 계속 표시됨. 원복 시 이 함수
// 호출부를 새 위저드/피커 어딘가에 다시 연결하면 됨.
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
