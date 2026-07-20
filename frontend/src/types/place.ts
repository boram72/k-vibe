import { Map, Coffee, Camera, ShoppingBag, Landmark, Utensils, Building2, type LucideIcon } from 'lucide-react'

export type CrowdLevel = 'low' | 'mid' | 'high'

export type PlaceCategory = 'all' | 'culture' | 'food' | 'fun' | 'photo' | 'cafe' | 'stay'

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
export const PLACE_CATEGORIES: PlaceCategoryMeta[] = [
  { id: 'all', icon: Map, labelKey: 'map.filter_all', pinBg: 'bg-slate-500' },
  { id: 'cafe', icon: Coffee, labelKey: 'map.filter_cafe', pinBg: 'bg-amber-600' },
  { id: 'photo', icon: Camera, labelKey: 'map.filter_photo', pinBg: 'bg-rose-500' },
  { id: 'fun', icon: ShoppingBag, labelKey: 'map.filter_fun', pinBg: 'bg-purple-500' },
  { id: 'culture', icon: Landmark, labelKey: 'map.filter_culture', pinBg: 'bg-indigo-500' },
  { id: 'food', icon: Utensils, labelKey: 'map.filter_food', pinBg: 'bg-orange-500' },
  { id: 'stay', icon: Building2, labelKey: 'map.filter_stay', pinBg: 'bg-sky-500' },
]

export function getCategoryLabelKey(category: PlaceCategory): string {
  return PLACE_CATEGORIES.find((c) => c.id === category)?.labelKey ?? 'map.filter_all'
}

export function getPlaceCategoryMeta(category: PlaceCategory): PlaceCategoryMeta {
  return PLACE_CATEGORIES.find((c) => c.id === category) ?? PLACE_CATEGORIES[0]
}
