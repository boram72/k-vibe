import { Coffee, Landmark, Pill, Plus, ShoppingBag, Sparkles, Toilet, TrainFront, type LucideIcon } from 'lucide-react'

export type FacilityType =
  | 'restroom'
  | 'atm'
  | 'medical'
  | 'transit'
  | 'pharmacy'
  | 'cafe_toilet'
  | 'convenience'
  | 'popup'

export type FacilityFilter = FacilityType | 'all'

export interface Facility {
  id: string
  type: FacilityType
  name: string
  address: string
  distance: number
  lat: number
  lng: number
  is24h?: boolean
  isOpen?: boolean
  hasDisabled?: boolean
  floor?: string
  extra?: string
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
// only (mirrors PLACE_CATEGORIES in types/place.ts). Colors use standard
// Tailwind palette tokens (not custom theme tokens) since these only need to
// visually distinguish 8 pin/badge colors, not carry semantic meaning the
// way crowd-low/mid/high do.
export const FACILITY_TYPE_META: FacilityTypeMeta[] = [
  { id: 'restroom', icon: Toilet, color: 'text-blue-500', bg: 'bg-blue-500/10', pinBg: 'bg-blue-500', labelKey: 'radar.facility_types.restroom' },
  { id: 'atm', icon: Landmark, color: 'text-cyan-500', bg: 'bg-cyan-500/10', pinBg: 'bg-cyan-500', labelKey: 'radar.facility_types.atm' },
  { id: 'medical', icon: Plus, color: 'text-rose-500', bg: 'bg-rose-500/10', pinBg: 'bg-rose-500', labelKey: 'radar.facility_types.medical' },
  { id: 'transit', icon: TrainFront, color: 'text-sky-500', bg: 'bg-sky-500/10', pinBg: 'bg-sky-500', labelKey: 'radar.facility_types.transit' },
  { id: 'pharmacy', icon: Pill, color: 'text-emerald-500', bg: 'bg-emerald-500/10', pinBg: 'bg-emerald-500', labelKey: 'radar.facility_types.pharmacy' },
  { id: 'cafe_toilet', icon: Coffee, color: 'text-amber-500', bg: 'bg-amber-500/10', pinBg: 'bg-amber-500', labelKey: 'radar.facility_types.cafe_toilet' },
  { id: 'convenience', icon: ShoppingBag, color: 'text-violet-500', bg: 'bg-violet-500/10', pinBg: 'bg-violet-500', labelKey: 'radar.facility_types.convenience' },
  { id: 'popup', icon: Sparkles, color: 'text-pink-500', bg: 'bg-pink-500/10', pinBg: 'bg-pink-500', labelKey: 'radar.facility_types.popup' },
]

export function getFacilityTypeMeta(type: FacilityType): FacilityTypeMeta {
  return FACILITY_TYPE_META.find((meta) => meta.id === type) ?? FACILITY_TYPE_META[0]
}
