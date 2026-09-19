import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPersonaPlaces } from '@/api/personas'
import type { Locale } from '@/i18n'

// PersonaCard(blocks/persona/persona-card.tsx)의 호버 슬라이드쇼에 넣을
// "그 persona가 방문한 실제 장소 사진"을 label별로 묶는 공용 훅 — 홈/페르소나
// 메뉴 두 곳이 동일한 쿼리 키를 쓰므로 캐시도 공유된다. react-refresh 규칙상
// 컴포넌트 파일(persona-card.tsx)엔 컴포넌트만 export해야 해서 별도 파일로 분리.
export function usePersonaCardImages(locale: Locale) {
  const placesQuery = useQuery({
    queryKey: ['persona-places', locale],
    queryFn: () => fetchPersonaPlaces(locale),
    staleTime: 30 * 60 * 1000,
  })

  return useMemo(() => {
    const map = new Map<string, string[]>()
    for (const place of placesQuery.data ?? []) {
      if (!place.imageUrl) continue
      for (const tag of place.tags ?? []) {
        map.set(tag, [...(map.get(tag) ?? []), place.imageUrl])
      }
    }
    return map
  }, [placesQuery.data])
}
