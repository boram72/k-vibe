import { apiClient, withFallback } from '@/api/client'
import { haversineKm } from '@/lib/haversine'
import type { Place } from '@/types/place'

export const SEOUL_PLACES: Place[] = [
  {
    id: '1',
    name: '경복궁',
    category: 'culture',
    address: '서울 종로구 사직로 161',
    lat: 37.5796,
    lng: 126.977,
    distanceM: 1200,
    crowdLevel: 'high',
    tags: ['한복', '궁궐', '역사'],
  },
  {
    id: '2',
    name: '광장시장 마약김밥',
    category: 'food',
    address: '서울 종로구 창경궁로 88',
    lat: 37.57,
    lng: 126.9996,
    distanceM: 800,
    crowdLevel: 'mid',
    tags: ['마약김밥', '전통시장'],
  },
  {
    id: '3',
    name: '홍대 놀이터',
    category: 'fun',
    address: '서울 마포구 어울마당로 35',
    lat: 37.5519,
    lng: 126.9227,
    distanceM: 2100,
    crowdLevel: 'high',
    tags: ['버스킹', '자유'],
  },
  {
    id: '4',
    name: '남산타워 포토스팟',
    category: 'photo',
    address: '서울 용산구 남산공원길 105',
    lat: 37.5512,
    lng: 126.9882,
    distanceM: 3400,
    crowdLevel: 'low',
    tags: ['야경', '전망'],
  },
  {
    id: '5',
    name: '성수동 카페거리',
    category: 'food',
    address: '서울 성동구 성수이로 78',
    lat: 37.5447,
    lng: 127.0564,
    distanceM: 1500,
    crowdLevel: 'mid',
    tags: ['감성카페', '루프탑'],
  },
  {
    id: '6',
    name: '한강공원 여의도',
    category: 'fun',
    address: '서울 영등포구 여의동로 330',
    lat: 37.5284,
    lng: 126.9341,
    distanceM: 4000,
    crowdLevel: 'low',
    tags: ['피크닉', '자전거'],
  },
]

const EXTRA_PLACES: Place[] = [
  {
    id: '7',
    name: '을지로 노가리골목',
    category: 'cafe',
    address: '서울 중구 을지로 지하 1',
    lat: 37.5663,
    lng: 126.9913,
    distanceM: 900,
    crowdLevel: 'mid',
    tags: ['레트로', '노포'],
  },
  {
    id: '8',
    name: '북촌 한옥마을 스테이',
    category: 'stay',
    address: '서울 종로구 계동길 37',
    lat: 37.5814,
    lng: 126.9853,
    distanceM: 1700,
    crowdLevel: 'low',
    tags: ['한옥', '게스트하우스'],
  },
]

const MAP_PLACES: Place[] = [...SEOUL_PLACES, ...EXTRA_PLACES]

export interface PlaceQuery {
  lat: number
  lng: number
  radius: number
  locale: string
}

// Used by MapPage while there's no UI to change radius yet (no real
// zoom/pan-capable map — see plan.md Step15 notes). Wide enough that all of
// today's mock places (~7.3km max from the Seoul fallback center) stay
// visible; whoever sets radius later (zoom-derived or otherwise) doesn't
// need this function's signature to change.
export const DEFAULT_MAP_SEARCH_RADIUS = 10000

function getMockMapPlaces({ lat, lng, radius }: PlaceQuery): Place[] {
  return MAP_PLACES.map((place) => ({
    ...place,
    distanceM: Math.round(haversineKm(lat, lng, place.lat, place.lng) * 1000),
  }))
    .filter((place) => place.distanceM <= radius)
    .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0))
}

export async function fetchMapPlaces(query: PlaceQuery): Promise<Place[]> {
  return withFallback(
    async () => (await apiClient.get<Place[]>('/places', { params: query })).data,
    () => getMockMapPlaces(query),
  )
}

export async function fetchHomeFeedPlaces(): Promise<Place[]> {
  return withFallback(
    async () => (await apiClient.get<Place[]>('/places')).data,
    () => SEOUL_PLACES,
  )
}

// See PLACE_DETAIL_INTEGRATION_REQUEST.md — phone/hours/tags aren't in the
// list response (TourAPI's locationBasedList2 doesn't have them; Kakao Local
// API doesn't have them at all), so they're fetched on demand only when the
// detail sheet actually opens for one place, not for every list item. `tags`
// here is TourAPI's cat3 subcategory name (e.g. "고궁") standing in for the
// free-text tags mock data had — real APIs have no such field, and this is
// a category label, not a filterable tag (clicking it doesn't filter the
// list — that would need cat3 on every list item, out of scope for now).
export interface PlaceDetail {
  phone?: string
  businessHours?: string
  overview?: string
  tags?: string[]
}

const MOCK_PLACE_DETAIL: PlaceDetail = {
  phone: '02-1234-5678',
  businessHours: '10:00~18:00 (월요일 휴무)',
  overview: '설명 정보가 준비 중입니다.',
  tags: ['고궁'],
}

export async function fetchPlaceDetail(contentId: string): Promise<PlaceDetail> {
  return withFallback(
    async () => (await apiClient.get<PlaceDetail>(`/places/${contentId}`)).data,
    () => MOCK_PLACE_DETAIL,
  )
}
