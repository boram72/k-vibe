import { apiClient, withFallback } from '@/api/client'

export interface PlaceReview {
  id: string
  placeId: string
  username: string
  rating: number
  content: string
  createdAt: string
}

interface RawReview {
  id?: unknown
  place_id?: unknown
  username?: unknown
  rating?: unknown
  content?: unknown
  created_at?: unknown
}

// 실제 백엔드(Supabase reviews 테이블)가 아직 없거나 호출이 실패할 때를 위한 로컬
// 폴백 저장소. 다른 api/*.ts 모듈들의 mock 데이터와 달리 "쓰기"가 있는 기능이라
// 새로고침해도 유지되도록 localStorage에 둔다(브라우저 로컬 한정, 다른 사용자와는
// 공유되지 않음 — 실제 백엔드가 붙으면 그쪽이 우선되고 이 저장소는 안 쓰임).
const MOCK_REVIEWS_STORAGE_KEY = 'k-vibe-mock-reviews'

function readMockReviewsStore(): Record<string, PlaceReview[]> {
  try {
    const raw = localStorage.getItem(MOCK_REVIEWS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, PlaceReview[]>) : {}
  } catch {
    return {}
  }
}

function writeMockReviewsStore(store: Record<string, PlaceReview[]>) {
  try {
    localStorage.setItem(MOCK_REVIEWS_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // localStorage unavailable (private mode, quota) — mock review just won't persist.
  }
}

function normalizeReview(raw: RawReview): PlaceReview | null {
  if (typeof raw.id !== 'string' || typeof raw.content !== 'string') return null
  const placeId = typeof raw.place_id === 'string' ? raw.place_id : ''
  const username = typeof raw.username === 'string' ? raw.username : ''
  const rating = typeof raw.rating === 'number' ? raw.rating : Number(raw.rating) || 0
  const createdAt = typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString()
  if (!placeId || !username) return null

  return { id: raw.id, placeId, username, rating, content: raw.content, createdAt }
}

export async function fetchPlaceReviews(placeId: string): Promise<PlaceReview[]> {
  return withFallback(
    async () => {
      const response = await apiClient.get<RawReview[]>(`/reviews/${encodeURIComponent(placeId)}`)
      return response.data.map(normalizeReview).filter((review): review is PlaceReview => Boolean(review))
    },
    () => readMockReviewsStore()[placeId] ?? [],
  )
}

export async function createPlaceReview(
  placeId: string,
  username: string,
  rating: number,
  content: string,
): Promise<PlaceReview> {
  return withFallback(
    async () => {
      const response = await apiClient.post<RawReview>(`/reviews/${encodeURIComponent(placeId)}`, {
        username,
        rating,
        content,
      })
      const normalized = normalizeReview(response.data)
      if (!normalized) throw new Error('Invalid review response')
      return normalized
    },
    () => {
      const store = readMockReviewsStore()
      const review: PlaceReview = {
        id: `mock-${Date.now()}`,
        placeId,
        username,
        rating,
        content,
        createdAt: new Date().toISOString(),
      }
      store[placeId] = [review, ...(store[placeId] ?? [])]
      writeMockReviewsStore(store)
      return review
    },
  )
}
