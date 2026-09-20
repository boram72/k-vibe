import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Sparkles } from 'lucide-react'
import { fetchKContentPersonas, type KContentPersona } from '@/api/personas'
import { PersonaCard } from '@/blocks/persona/persona-card'
import { usePersonaCardImages } from '@/lib/use-persona-card-images'
import type { Locale } from '@/i18n'

// Home-screen entry point for the persona feature (2026-09 redesign — this
// replaces the old "근처 인기 K-스팟" HomeFeed section as the headline block).
// Only lists personas and hands the pick off via onSelect; PersonaPage owns
// actually generating the route so this component stays free of navigation
// concerns and is easy to reuse (e.g. inside a modal) later if needed.
//
// 카드 자체(이미지 호버 슬라이드쇼+이름/뱃지/무드태그/설명)는
// blocks/persona/persona-card.tsx의 PersonaCard를 그대로 공유 — 여기선 상위
// 몇 개를 보여줄지, 가로스크롤/그리드로 어떻게 배치할지만 결정한다(대화로
// 확정한 "카드는 공유, 배치는 페이지가 결정" 원칙).
//
// 2026-09 태스크보드 1번 — 상위 4개만 노출(routeCnt 내림차순, 값이 같으면
// 응답 순서 유지 — Array.prototype.sort는 안정 정렬이라 별도 처리 불필요).
const TOP_PERSONA_COUNT = 4

interface PersonaPickerProps {
  onSelect: (persona: KContentPersona) => void
}

export function PersonaPicker({ onSelect }: PersonaPickerProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const locale = i18n.language as Locale

  const personasQuery = useQuery({
    queryKey: ['k-content-personas', locale],
    queryFn: () => fetchKContentPersonas(locale),
  })
  const imagesByLabel = usePersonaCardImages(locale)

  const topPersonas = useMemo(
    () => [...(personasQuery.data ?? [])].sort((a, b) => b.routeCnt - a.routeCnt).slice(0, TOP_PERSONA_COUNT),
    [personasQuery.data],
  )

  return (
    <section data-tour="home-persona" className="w-full space-y-3">
      <div>
        <h2 className="mt-0.5 flex items-center gap-1.5 text-lg font-bold text-foreground">
          <Sparkles
            className="h-4.5 w-4.5"
            color="url(#kvibe-sparkle-gradient)"
            fill="url(#kvibe-sparkle-gradient)"
          />
          {t('persona.k_content_title')}
        </h2>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-xs leading-5 text-muted-foreground">{t('persona.k_content_subtitle')}</p>
          <button
            type="button"
            onClick={() => navigate('persona')}
            className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
          >
            {t('persona.view_more')}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 scrollbar-hide scroll-fade-x md:mx-0 md:mask-none md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {personasQuery.isPending &&
          Array.from({ length: TOP_PERSONA_COUNT }).map((_, index) => (
            <div
              key={index}
              className="w-40 shrink-0 animate-pulse overflow-hidden rounded-2xl border border-border bg-muted md:w-full md:shrink"
            >
              <div className="aspect-square w-full bg-muted" />
            </div>
          ))}

        {!personasQuery.isPending &&
          topPersonas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              images={imagesByLabel.get(persona.label) ?? []}
              onSelect={onSelect}
              className="w-40 shrink-0 md:w-full md:shrink"
            />
          ))}
      </div>
    </section>
  )
}
