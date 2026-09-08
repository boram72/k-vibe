import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { fetchKContentPersonas, type KContentPersona } from '@/api/personas'
import type { Locale } from '@/i18n'

// Home-screen entry point for the persona feature (2026-09 redesign — this
// replaces the old "근처 인기 K-스팟" HomeFeed section as the headline block).
// Only lists personas and hands the pick off via onSelect; PersonaPage owns
// actually generating the route so this component stays free of navigation
// concerns and is easy to reuse (e.g. inside a modal) later if needed.
//
// Card shape: square photo tile + info below, matching the old HomeFeed
// PlaceCard (blocks/common/place-card.tsx) look the team asked to reuse here,
// laid out in the same mobile-scroll/desktop-grid pattern as HomeFeed.

function PersonaCardImage({ persona }: { persona: KContentPersona }) {
  const [imageFailed, setImageFailed] = useState(false)

  if (persona.profileImg && !imageFailed) {
    return (
      <img
        src={persona.profileImg}
        alt={`${persona.label} profile`}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className="h-full w-full object-cover"
      />
    )
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-primary/15 text-2xl font-bold text-primary">
      {persona.badge}
    </div>
  )
}

interface PersonaPickerProps {
  onSelect: (persona: KContentPersona) => void
}

export function PersonaPicker({ onSelect }: PersonaPickerProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language as Locale

  const personasQuery = useQuery({
    queryKey: ['k-content-personas', locale],
    queryFn: () => fetchKContentPersonas(locale),
  })

  return (
    <section className="w-full space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {t('persona.k_content_eyebrow')}
        </p>
        <h2 className="mt-0.5 flex items-center gap-1.5 text-lg font-bold text-foreground">
          <Sparkles className="h-4.5 w-4.5 text-primary" />
          {t('persona.k_content_title')}
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('persona.k_content_subtitle')}</p>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 scrollbar-hide scroll-fade-x md:mx-0 md:mask-none md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {personasQuery.isPending &&
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="w-40 shrink-0 animate-pulse overflow-hidden rounded-2xl border border-border bg-muted md:w-full md:shrink"
            >
              <div className="aspect-square w-full bg-muted" />
            </div>
          ))}

        {!personasQuery.isPending &&
          (personasQuery.data ?? []).map((persona) => (
            <button
              key={persona.id}
              type="button"
              onClick={() => onSelect(persona)}
              className="w-40 shrink-0 overflow-hidden rounded-2xl border border-border bg-card text-left transition-all hover:border-primary/60 hover:bg-primary/10 md:w-full md:shrink"
            >
              <div className="aspect-square w-full bg-muted">
                <PersonaCardImage persona={persona} />
              </div>
              <div className="space-y-1 p-3">
                <p className="truncate font-semibold text-foreground">{persona.label}</p>
                <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  {persona.routeCnt}
                  {t('persona.stops_suffix')}
                </span>
                <p className="truncate text-[10px] font-medium text-primary">
                  {persona.moods.map((mood) => `#${mood}`).join(' ')}
                </p>
                <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{persona.description}</p>
              </div>
            </button>
          ))}
      </div>
    </section>
  )
}
