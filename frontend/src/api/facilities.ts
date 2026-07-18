import { apiClient, withFallback } from '@/api/client'
import { haversineKm } from '@/lib/haversine'
import type { Facility, FacilityFilter, FacilityType } from '@/types/facility'

interface FacilityBlueprint extends Omit<Facility, 'lat' | 'lng' | 'distance'> {
  offsetLat: number
  offsetLng: number
}

// Ported from hslee's FACILITY_BLUEPRINTS — offsets are relative to whatever
// center coordinate is passed in, so the same 9 facilities re-anchor around
// the user's current location instead of being pinned to one fixed spot.
const FACILITY_BLUEPRINTS: FacilityBlueprint[] = [
  {
    id: 'facility_restroom_station',
    type: 'restroom',
    name: 'Seongsu Station Public Restroom',
    address: 'Seongsu Station Exit 3, B1',
    is24h: true,
    hasDisabled: true,
    floor: 'B1',
    offsetLat: 0.0006,
    offsetLng: 0.0004,
  },
  {
    id: 'facility_pharmacy_main',
    type: 'pharmacy',
    name: 'Seongsu Onnuri Pharmacy',
    address: '77 Seongsui-ro, Seongdong-gu',
    isOpen: true,
    offsetLat: 0.0016,
    offsetLng: 0.0012,
  },
  {
    id: 'facility_atm_bank',
    type: 'atm',
    name: 'KB ATM Seongsu Branch',
    address: '82 Seongsui-ro, Seongdong-gu',
    is24h: true,
    extra: 'International cards may vary by issuer',
    offsetLat: 0.001,
    offsetLng: -0.0009,
  },
  {
    id: 'facility_medical_clinic',
    type: 'medical',
    name: 'Seongsu 24h Travel Clinic',
    address: '91 Seongsui-ro, Seongdong-gu',
    isOpen: true,
    extra: '24h emergency desk / English help desk',
    offsetLat: 0.0019,
    offsetLng: -0.0013,
  },
  {
    id: 'facility_transit_station',
    type: 'transit',
    name: 'Seongsu Station Exit 3',
    address: 'Seongsu Station, Line 2',
    isOpen: true,
    extra: 'Line 2 / airport transfer via Hongik Univ.',
    offsetLat: 0.0014,
    offsetLng: 0.0003,
  },
  {
    id: 'facility_convenience_cu',
    type: 'convenience',
    name: 'CU Seongsu Cafe Street',
    address: '68 Seongsu-ro, Seongdong-gu',
    is24h: true,
    offsetLat: -0.0021,
    offsetLng: 0.0015,
  },
  {
    id: 'facility_popup_musinsa',
    type: 'popup',
    name: 'Musinsa Pop-up Store',
    address: '113 Achasan-ro, Seongdong-gu',
    isOpen: true,
    extra: 'Runs through 2026-06-30',
    offsetLat: 0.003,
    offsetLng: 0.0022,
  },
  {
    id: 'facility_cafe_toilet',
    type: 'cafe_toilet',
    name: 'Partner Cafe Restroom',
    address: '99 Seongsu-ro, Seongdong-gu',
    isOpen: true,
    extra: 'Available to paying customers',
    offsetLat: -0.0041,
    offsetLng: -0.0022,
  },
  {
    id: 'facility_restroom_park',
    type: 'restroom',
    name: 'Ttukseom Park Public Restroom',
    address: 'Ttukseom Hangang Park, B1',
    is24h: false,
    hasDisabled: true,
    floor: 'B1',
    offsetLat: 0.0065,
    offsetLng: 0.003,
  },
]

export interface FacilityQuery {
  lat: number
  lng: number
  radius: number
  filter: FacilityFilter
  locale?: string
}

function getMockFacilities({ lat, lng, radius, filter }: FacilityQuery): Facility[] {
  return FACILITY_BLUEPRINTS.map(({ offsetLat, offsetLng, ...rest }) => {
    const facilityLat = lat + offsetLat
    const facilityLng = lng + offsetLng
    const distance = Math.round(haversineKm(lat, lng, facilityLat, facilityLng) * 1000)
    return { ...rest, lat: facilityLat, lng: facilityLng, distance }
  })
    .filter((facility) => facility.distance <= radius)
    .filter((facility) => filter === 'all' || facility.type === filter)
    .sort((a, b) => a.distance - b.distance)
}

export async function fetchFacilities(query: FacilityQuery): Promise<Facility[]> {
  return withFallback(
    async () => (await apiClient.get<Facility[]>('/facilities', { params: query })).data,
    () => getMockFacilities(query),
  )
}

export type { Facility, FacilityType, FacilityFilter }
