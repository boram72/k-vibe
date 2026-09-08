import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Sparkles } from 'lucide-react'
import { fetchKContentPersonas, type KContentPersona } from '@/api/personas'
import { ZoomableImage } from '@/blocks/common/zoomable-image'
import type { Locale } from '@/i18n'

// Home-screen entry point for the persona feature (2026-09 redesign — this
// replaces the old "근처 인기 K-스팟" HomeFeed section as the headline block).
// Only lists personas and hands the pick off via onSelect; PersonaPage owns
// actually generating the route so this component stays free of navigation
// concerns and is easy to reuse (e.g. inside a modal) later if needed.

function PersonaAvatar({ persona }: { persona: KContentPersona }) {
  const [imageFailed, setImageFailed] = useState(false)

  if (persona.profileImg && !imageFailed) {
    return (
      <ZoomableImage
        src={persona.profileImg}
        alt={`${persona.label} profile`}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className="h-12 w-12 shrink-0 rounded-xl object-cover"
      />
    )
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-xs font-bold text-primary">
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

      <div className="space-y-2">
        {personasQuery.isPending &&
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[72px] animate-pulse rounded-xl border border-border bg-muted" />
          ))}

        {!personasQuery.isPending &&
          (personasQuery.data ?? []).map((persona) => (
            <button
              key={persona.id}
              type="button"
              onClick={() => onSelect(persona)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/60 hover:bg-primary/10"
            >
              <PersonaAvatar persona={persona} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{persona.label}</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {persona.routeCnt}
                    {t('persona.stops_suffix')}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{persona.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
      </div>
    </section>
  )
}
