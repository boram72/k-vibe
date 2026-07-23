import { apiClient, withFallback } from '@/api/client'

export interface RelatedAttraction {
  // TourAPI contentid for the attraction itself (added in TarRlteTarService1
  // v4.1's tAtsCd) — not yet used anywhere, kept for future code-based
  // lookup/linking instead of matching by attractionName text.
  attractionContentId?: string
  attractionName: string
  relatedContentId: string
  relatedName: string
  relatedAreaName?: string
  relatedSignguName?: string
  categoryLarge?: string
  categoryMedium?: string
  categorySmall?: string
  rank: number
}

// TourAPI's TarRlteTarService1 groups results by the district's own attractions
// (attractionName), each with a ranked list of related spots — mocked here as a
// single representative Seoul group since there's no client-side way to derive
// the real district from lat/lng without the same reverse-geocoding the backend does.
const MOCK_RELATED_ATTRACTIONS: RelatedAttraction[] = [
  {
    attractionContentId: 'mock-namsan',
    attractionName: '남산서울타워',
    relatedContentId: 'mock-1',
    relatedName: '명동성당',
    relatedAreaName: '서울특별시',
    relatedSignguName: '중구',
    categoryLarge: '관광지',
    categoryMedium: '문화관광',
    categorySmall: '종교성지',
    rank: 1,
  },
  {
    attractionContentId: 'mock-namsan',
    attractionName: '남산서울타워',
    relatedContentId: 'mock-2',
    relatedName: '을지로 노가리골목',
    relatedAreaName: '서울특별시',
    relatedSignguName: '중구',
    categoryLarge: '음식',
    categoryMedium: '음식',
    categorySmall: '주점',
    rank: 2,
  },
  {
    attractionContentId: 'mock-namsan',
    attractionName: '남산서울타워',
    relatedContentId: 'mock-3',
    relatedName: '광장시장',
    relatedAreaName: '서울특별시',
    relatedSignguName: '종로구',
    categoryLarge: '관광지',
    categoryMedium: '쇼핑',
    categorySmall: '전통시장',
    rank: 3,
  },
]

export interface RelatedAttractionsQuery {
  lat: number
  lng: number
}

export async function fetchRelatedAttractions(query: RelatedAttractionsQuery): Promise<RelatedAttraction[]> {
  return withFallback(
    async () => (await apiClient.get<RelatedAttraction[]>('/attractions/related', { params: query })).data,
    () => MOCK_RELATED_ATTRACTIONS,
  )
}
