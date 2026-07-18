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
}

// Single source of truth for category metadata — add/remove a category here only.
export const PLACE_CATEGORIES: PlaceCategoryMeta[] = [
  { id: 'all', icon: Map, labelKey: 'map.filter_all' },
  { id: 'cafe', icon: Coffee, labelKey: 'map.filter_cafe' },
  { id: 'photo', icon: Camera, labelKey: 'map.filter_photo' },
  { id: 'fun', icon: ShoppingBag, labelKey: 'map.filter_fun' },
  { id: 'culture', icon: Landmark, labelKey: 'map.filter_culture' },
  { id: 'food', icon: Utensils, labelKey: 'map.filter_food' },
  { id: 'stay', icon: Building2, labelKey: 'map.filter_stay' },
]

export function getCategoryLabelKey(category: PlaceCategory): string {
  return PLACE_CATEGORIES.find((c) => c.id === category)?.labelKey ?? 'map.filter_all'
}
