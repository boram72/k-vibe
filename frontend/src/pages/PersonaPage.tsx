import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronRight, Sparkles } from 'lucide-react'
import { RouteResult } from '@/blocks/persona/route-result'
import { Button } from '@/components/ui/button'
import { fetchKContentPersonas, fetchKContentPersonaRoute, type KContentPersona } from '@/api/personas'
import { type RoutePlan } from '@/lib/route-timing'
import { addStopsToRouteDraft, savePersonaRoutePlan } from '@/lib/route-draft'
import { usePageHelpStore } from '@/store/page-help-store'
import type { Locale } from '@/i18n'

const START_TIME = '10:00'

function buildRouteTitle(persona: KContentPersona, locale: string): string {
  if (locale === 'ko') return `${persona.label} 하루 루트`
  if (locale === 'ja') return `${persona.label} 1日ルート`
  if (locale === 'zh') return `${persona.label}一日路线`
  return `${persona.label} One-Day Route`
}

function PersonaAvatar({ persona }: { persona: KContentPersona }) {
  const [imageFailed, setImageFailed] = useState(false)

  if (persona.profileImg && !imageFailed) {
    return (
      <img
        src={persona.profileImg}
        alt={`${persona.label} profile`}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className="h-10 w-10 shrink-0 rounded-xl object-cover"
      />
    )
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-xs font-bold text-primary">
      {persona.badge}
    </div>
  )
}

export default function PersonaPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const setHelp = usePageHelpStore((s) => s.setHelp)
  const clearHelp = usePageHelpStore((s) => s.clearHelp)

  const locale = i18n.language as Locale
  const [selectedPersona, setSelectedPersona] = useState<KContentPersona | null>(null)
  const [plan, setPlan] = useState<RoutePlan | null>(null)

  useEffect(() => {
    setHelp(t('persona.help_title'), t('persona.help_body'))
    return () => clearHelp()
  }, [setHelp, clearHelp, t])

  const personasQuery = useQuery({
    queryKey: ['k-content-personas', locale],
    queryFn: () => fetchKContentPersonas(locale),
  })

  const mutation = useMutation({
    mutationFn: async (persona: KContentPersona) => {
      const scheduled = await fetchKContentPersonaRoute(persona.id, START_TIME, locale)
      const title = buildRouteTitle(persona, locale)
      const result: RoutePlan = {
        ...scheduled,
        title,
        summary: scheduled.summary ?? persona.description,
        shareText: `${title}: ${scheduled.stops.map((s) => s.name).join(' -> ')}`,
      }
      return result
    },
    onSuccess: (result) => {
      setPlan(result)
      toast.success(t('persona.route_generated'))
    },
  })

  function reset() {
    setSelectedPersona(null)
    setPlan(null)
    mutation.reset()
  }

  function handleSelectPersona(persona: KContentPersona) {
    setSelectedPersona(persona)
    mutation.mutate(persona)
  }

  function handleAddToRoute() {
    if (!plan) return
    savePersonaRoutePlan(plan)
    const ts = Date.now()
    addStopsToRouteDraft(
      plan.stops.map((s) => ({ ...s, id: `${s.id}-${ts}`, placeId: s.id, fromPersona: true })),
    )
    toast.success(t('persona.route_saved'))
    navigate('../route')
  }

  async function handleShare() {
    if (!plan) return
    try {
      if (navigator.share) {
        await navigator.share({ title: plan.title, text: plan.shareText, url: window.location.href })
        toast.success(t('persona.shared'))
        return
      }
      await navigator.clipboard.writeText(plan.shareText)
      toast.success(t('persona.copied'))
    } catch {
      toast.error(t('persona.share_unavailable'))
    }
  }

  if (plan) {
    return (
      <div className="mx-auto w-full space-y-4 px-4 py-4 md:max-w-2xl">
        <RouteResult plan={plan} onReset={reset} onAddToRoute={handleAddToRoute} onShare={handleShare} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-full w-full flex-col px-4 md:max-w-2xl">
      <div className="flex-1 space-y-4 py-4">
        <div>
          <p className="text-xs font-semibold text-primary">{t('persona.generator_eyebrow')}</p>
          <h2 className="mt-1 text-lg font-bold text-foreground">{t('persona.title')}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('persona.subtitle')}</p>
          <div className="mt-4 h-1 rounded-full bg-primary" />
        </div>

        <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-3">
          <p className="text-xs font-semibold text-primary">{t('persona.k_content_eyebrow')}</p>
          <h3 className="mt-0.5 text-base font-bold text-foreground">{t('persona.k_content_title')}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('persona.k_content_subtitle')}</p>

          <div className="mt-3 space-y-2">
            {personasQuery.isPending &&
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-[64px] animate-pulse rounded-xl border border-border bg-muted" />
              ))}

            {!personasQuery.isPending &&
              (personasQuery.data ?? []).map((persona) => {
                const isSelected = selectedPersona?.id === persona.id
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => handleSelectPersona(persona)}
                    disabled={mutation.isPending}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition-all hover:border-primary/60 hover:bg-primary/10 disabled:opacity-70"
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
                      <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {persona.description}
                      </p>
                    </div>
                    {mutation.isPending && isSelected ? (
                      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                )
              })}
          </div>
        </div>

        {mutation.isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm font-semibold text-destructive">{t('persona.error_title')}</p>
            <Button
              variant="destructive"
              size="sm"
              className="mt-2"
              disabled={!selectedPersona || mutation.isPending}
              onClick={() => selectedPersona && mutation.mutate(selectedPersona)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t('persona.retry')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
