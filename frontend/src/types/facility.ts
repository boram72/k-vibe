import { Store, Pill, Landmark, type LucideIcon } from 'lucide-react'

// Mirrors the backend's amenities categories (Kakao Local API category search) —
// see backend/externelAPI_services/amenities.py. Facility radar is powered by
// this real API, not mock data.
export type FacilityType = 'convenience_store' | 'pharmacy' | 'bank_atm'

export type FacilityFilter = FacilityType | 'all'

export interface Facility {
  id: string
  type: FacilityType
  name: string
  address: string
  distance: number
  lat: number
  lng: number
  tel?: string
  image?: string
}

export interface FacilityTypeMeta {
  id: FacilityType
  icon: LucideIcon
  /** Text color, e.g. badge label/icon. */
  color: string
  /** Tinted background, e.g. badge fill. */
  bg: string
  /** Solid background for map pins — kept as its own literal class (not
   * derived from `color`/`bg` at runtime) because Tailwind's compiler only
   * picks up classes it can find as literal strings in source. */
  pinBg: string
  labelKey: string
}

// Single source of truth for facility-type metadata — add/remove a type here
// only (mirrors PLACE_CATEGORIES in types/place.ts).
export const FACILITY_TYPE_META: FacilityTypeMeta[] = [
  { id: 'convenience_store', icon: Store, color: 'text-blue-500', bg: 'bg-blue-500/10', pinBg: 'bg-blue-500', labelKey: 'radar.facility_types.convenience_store' },
  { id: 'pharmacy', icon: Pill, color: 'text-emerald-500', bg: 'bg-emerald-500/10', pinBg: 'bg-emerald-500', labelKey: 'radar.facility_types.pharmacy' },
  { id: 'bank_atm', icon: Landmark, color: 'text-amber-500', bg: 'bg-amber-500/10', pinBg: 'bg-amber-500', labelKey: 'radar.facility_types.bank_atm' },
]

export function getFacilityTypeMeta(type: FacilityType): FacilityTypeMeta {
  return FACILITY_TYPE_META.find((meta) => meta.id === type) ?? FACILITY_TYPE_META[0]
}
