import { Map, ShoppingBag, Landmark, Palette, PartyPopper, Utensils, Building2, type LucideIcon } from 'lucide-react'

export type CrowdLevel = 'low' | 'mid' | 'high'

export type PlaceCategory =
  | 'all'
  | 'attraction'
  | 'culture'
  | 'festival'
  | 'shopping'
  | 'food'
  | 'fun'
  | 'photo'
  | 'cafe'
  | 'stay'
  // 2026-09 QA 8번 — 카카오 상호명 검색 결과 중 우리 카테고리 어디에도 안
  // 맞는 것(은행/편의점/지하철역/병원 등, kakao-area-search.ts 참고)에 붙이는
  // 값. PLACE_CATEGORIES 배열엔 안 넣어서 필터 칩으로는 절대 안 뜨고, "전체"
  // 탭에서만 보임(대화로 확정) — 없는 카테고리로 억지로 분류해 필터를
  // 헷갈리게 하지 않기 위함.
  | 'business'

export interface Place {
  id: string
  name: string
  category: PlaceCategory
  address: string
  lat: number
  lng: number
  imageUrl?: string
  distanceM?: number
  crowdLevel?: CrowdLevel
  tags?: string[]
}

export interface PlaceCategoryMeta {
  id: PlaceCategory
  icon: LucideIcon
  labelKey: string
  // Tailwind bg-* literal for map pins — kept as a literal (not derived via
  // .replace('text-','bg-')) so Tailwind's static analysis can find the class.
  // Same pattern as FACILITY_TYPE_META.pinBg (src/types/facility.ts).
  pinBg: string
}

// Single source of truth for category metadata — add/remove a category here only.
//
// 'cafe'/'photo'는 목록에서 제외했다(2026-09 QA 피드백 1번) — 백엔드 `/places`가
// TourAPI 하나만 쓰는데, TourAPI의 contentTypeId 매핑(externelAPI_services/tourAPI.py
// CONTENT_TYPE_TO_CATEGORY)엔 애초에 "카페"/"포토" 전용 타입이 없어서(카페는 전부
// "음식점"으로 뭉뚱그려져 food로 들어옴) 실제 지도에서 이 두 카테고리는 항상
// 결과가 0건이었다 — 검색 버그가 아니라 데이터 소스 자체의 구조적 한계로 확인됨
// (실제 API 응답으로 직접 검증). 사용자에게 고를 수 있는 것처럼 보이는 필터를
// 계속 노출하면 "왜 카페를 눌러도 아무것도 안 나오지"라는 혼란만 주므로 필터
// 칩 목록에서 완전히 제거. `PlaceCategory` 타입 자체(과거 mock 데이터/무드 태그
// 등 다른 곳에서 여전히 이 문자열을 쓰는 곳들)는 안 건드림 — 그 값을 가진
// 장소가 들어와도 `getCategoryLabelKey`/`getPlaceCategoryMeta`가 'all'로
// 안전하게 폴백하므로 깨지지 않는다.
//
// 반대로 'fun'(15 축제행사+28 레포츠+38 쇼핑을 전부 뭉뚱그린 옛 "놀거리")은
// TourAPI에 실제로 존재하는 데이터인데도 세 콘텐츠타입을 한 카테고리로 합쳐놔서
// 사용자가 축제/쇼핑을 따로 찾을 수 없었다 — 실제 API 응답으로 물량 확인 후
// (대화로 확정) 'attraction'(관광지=12+28)/'festival'(축제=15)/'shopping'
// (쇼핑=38) 세 카테고리로 쪼갬. 레포츠(28)는 도심 기준 데이터가 워낙 희소해
// 별도 카테고리로 두지 않고 관광지에 편입. 기존 'culture'는 문화시설(14)만
// 남도록 범위가 좁아짐(관광지(12)가 별도 카테고리로 분리됐으므로).
export const PLACE_CATEGORIES: PlaceCategoryMeta[] = [
  { id: 'all', icon: Map, labelKey: 'map.filter_all', pinBg: 'bg-slate-500' },
  { id: 'attraction', icon: Landmark, labelKey: 'map.filter_attraction', pinBg: 'bg-indigo-500' },
  { id: 'culture', icon: Palette, labelKey: 'map.filter_culture', pinBg: 'bg-teal-500' },
  { id: 'festival', icon: PartyPopper, labelKey: 'map.filter_festival', pinBg: 'bg-rose-500' },
  { id: 'shopping', icon: ShoppingBag, labelKey: 'map.filter_shopping', pinBg: 'bg-purple-500' },
  { id: 'food', icon: Utensils, labelKey: 'map.filter_food', pinBg: 'bg-orange-500' },
  { id: 'stay', icon: Building2, labelKey: 'map.filter_stay', pinBg: 'bg-sky-500' },
]

export function getCategoryLabelKey(category: PlaceCategory): string {
  return PLACE_CATEGORIES.find((c) => c.id === category)?.labelKey ?? 'map.filter_all'
}

export function getPlaceCategoryMeta(category: PlaceCategory): PlaceCategoryMeta {
  return PLACE_CATEGORIES.find((c) => c.id === category) ?? PLACE_CATEGORIES[0]
}
