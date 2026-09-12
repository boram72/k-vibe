import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { fetchKContentPersonas } from '@/api/personas'
import type { Locale } from '@/i18n'
import { cn } from '@/lib/utils'

interface StarFilterProps {
  // 다중선택 — CategoryFilter(types/place.ts의 'all' 리터럴 멤버)와 달리
  // 페르소나 라벨은 API가 내려주는 자유 문자열이라 sentinel 멤버를 둘 수 없다.
  // 빈 배열 자체를 "전체"로 취급(대화 중 요청으로 단일선택 → 다중선택 전환).
  selected: string[]
  onChange: (stars: string[]) => void
}

// 2026-09 태스크보드 9번 — 스타(페르소나)별 필터. 옵션 목록은 별도 API/DB 조회
// 없이 페르소나 카탈로그(fetchKContentPersonas)의 label을 그대로 재사용한다 —
// 같은 쿼리키(['k-content-personas', locale])를 써서 persona-picker.tsx와
// React Query 캐시를 공유. 필터링은 MapPage 쪽에서 place.tags에 이 label들 중
// 하나라도 일치하는 값이 있는지로 판단.
export function StarFilter({ selected, onChange }: StarFilterProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language as Locale
  const { data: personas = [] } = useQuery({
    queryKey: ['k-content-personas', locale],
    queryFn: () => fetchKContentPersonas(locale),
  })

  function toggle(label: string) {
    const next = selected.includes(label) ? selected.filter((s) => s !== label) : [...selected, label]
    onChange(next)
  }

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-hide md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
      <button
        type="button"
        aria-pressed={selected.length === 0}
        onClick={() => onChange([])}
        className={cn(
          'whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
          selected.length === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {t('map.filter_all')}
      </button>
      {personas.map((persona) => {
        const active = selected.includes(persona.label)
        return (
          <button
            key={persona.id}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(persona.label)}
            className={cn(
              'whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {persona.label}
          </button>
        )
      })}
    </div>
  )
}
