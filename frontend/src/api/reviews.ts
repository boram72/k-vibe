import { apiClient } from '@/api/client'

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

function normalizeReview(raw: RawReview): PlaceReview | null {
  if (typeof raw.id !== 'string' || typeof raw.content !== 'string') return null
  const placeId = typeof raw.place_id === 'string' ? raw.place_id : ''
  const username = typeof raw.username === 'string' ? raw.username : ''
  const rating = typeof raw.rating === 'number' ? raw.rating : Number(raw.rating) || 0
  const createdAt = typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString()
  if (!placeId || !username) return null

  return { id: raw.id, placeId, username, rating, content: raw.content, createdAt }
}

// 2026-09 버그 수정(FRONTEND_TODO_map_pan_search.md) — 예전엔 다른 api/*.ts처럼
// withFallback()으로 실패 시 조용히 브라우저별 localStorage mock으로 새는
// 구조였다. 다른 모듈들은 "백엔드가 아직 없을 수도 있다"는 전제라 그게
// 맞지만, 리뷰는 백엔드가 이미 정상 동작 중이라 실패는 대부분 일시적
// 네트워크/콜드스타트 문제 — 조용히 mock으로 새면 "리뷰가 보였다 안 보였다"
// (기기/시크릿창마다 다른 mock 저장소를 봄)처럼 보여서 오히려 혼란을 키웠다.
// 그래서 여기선 폴백 없이 그대로 던지고, 호출부(place-review-tab.tsx)가
// 실패를 사용자에게 보여주고 재시도하게 한다.
export async function fetchPlaceReviews(placeId: string): Promise<PlaceReview[]> {
  const response = await apiClient.get<RawReview[]>(`/reviews/${encodeURIComponent(placeId)}`)
  return response.data.map(normalizeReview).filter((review): review is PlaceReview => Boolean(review))
}

export async function createPlaceReview(
  placeId: string,
  username: string,
  rating: number,
  content: string,
): Promise<PlaceReview> {
  const response = await apiClient.post<RawReview>(`/reviews/${encodeURIComponent(placeId)}`, {
    username,
    rating,
    content,
  })
  const normalized = normalizeReview(response.data)
  if (!normalized) throw new Error('Invalid review response')
  return normalized
}
