import { apiClient, withFallback } from '@/api/client'

export interface DocentGuide {
  name: string
  language: string
  audioUrl?: string | null
  file_path?: string | null
  script: string
  source: 'backend' | 'backend-script' | 'mock'
}

function fallbackGuide(name: string, language: string): DocentGuide {
  return {
    name,
    language,
    audioUrl: null,
    file_path: null,
    script:
      language === 'ko'
        ? `${name}에 도착했습니다. 주변 동선과 사진 포인트를 확인하면서 천천히 둘러보세요.`
        : `You have arrived at ${name}. Take a moment to check the route, nearby context, and photo spots.`,
    source: 'mock',
  }
}

export async function fetchDocentGuide(name: string, language: string): Promise<DocentGuide> {
  return withFallback(
    async () =>
      (
        await apiClient.get<DocentGuide>(`/docent/${encodeURIComponent(name)}`, {
          params: { language },
        })
      ).data,
    () => fallbackGuide(name, language),
  )
}
