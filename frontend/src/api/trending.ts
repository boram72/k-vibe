import { apiClient, withFallback } from '@/api/client'

const MOCK_KEYWORDS = ['인생네컷', '코인노래방', '방탈출', '성수 카페', '홍대 빈티지']

export async function fetchTrendingKeywords(): Promise<string[]> {
  return withFallback(
    async () => (await apiClient.get<string[]>('/trending')).data,
    () => MOCK_KEYWORDS,
  )
}
