import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronRight, Sparkles } from 'lucide-react'
import { DetailStep } from '@/blocks/persona/detail-step'
import { ConfirmStep } from '@/blocks/persona/confirm-step'
import { RouteResult } from '@/blocks/persona/route-result'
import { Button } from '@/components/ui/button'
import { fetchScheduledRoute } from '@/api/routes'
import { type RoutePlan } from '@/lib/route-timing'
import { addStopsToRouteDraft, savePersonaRoutePlan } from '@/lib/route-draft'
import { savePersonaPreference } from '@/lib/persona-preference'
import type { RouteTheme } from '@/types/route-theme'
import { usePageHelpStore } from '@/store/page-help-store'
import { cn } from '@/lib/utils'

type Step = 1 | 2

export default function PersonaPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const setHelp = usePageHelpStore((s) => s.setHelp)
  const clearHelp = usePageHelpStore((s) => s.clearHelp)

  const [step, setStep] = useState<Step>(1)
  const [theme, setTheme] = useState<RouteTheme | ''>('kpop')
  const [detail, setDetail] = useState('')
  const startTime = '10:00'
  const [plan, setPlan] = useState<RoutePlan | null>(null)

  useEffect(() => {
    setHelp(t('persona.help_title'), t('persona.help_body'))
    return () => clearHelp()
  }, [setHelp, clearHelp, t])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!theme || !detail) throw new Error('Theme/detail not selected')
      const scheduled = await fetchScheduledRoute(theme, detail, startTime, i18n.language)
      const detailLabel = t(`persona.themes.${theme}.details.${detail}.label`)
      const title = t('persona.route_title_template', { detail: detailLabel })
      const result: RoutePlan = {
        ...scheduled,
        title,
        summary: '',
        shareText: `${title}: ${scheduled.stops.map((s) => s.name).join(' -> ')}`,
      }
      return result
    },
    onSuccess: (result) => setPlan(result),
  })

  function reset() {
    setStep(1)
    setTheme('')
    setDetail('')
    setPlan(null)
    mutation.reset()
  }

  function handleSelectTheme(nextTheme: RouteTheme) {
    setTheme(nextTheme)
    setDetail('')
  }

  function handlePersonalizeFeed() {
    if (!theme || !detail) return
    savePersonaPreference(theme, detail)
    toast.success(t('persona.persona_saved'))
    navigate('..')
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
          <div className="mt-4 flex gap-1.5">
            {([1, 2] as const).map((item) => (
              <div key={item} className={cn('h-1 flex-1 rounded-full', step >= item ? 'bg-primary' : 'bg-border')} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <DetailStep
            theme={theme}
            detail={detail}
            onSelectTheme={handleSelectTheme}
            onSelectDetail={setDetail}
          />
        )}

        {step === 2 && theme && detail && (
          <ConfirmStep
            theme={theme}
            detail={detail}
            onBack={() => setStep(1)}
            onPersonalizeFeed={handlePersonalizeFeed}
          />
        )}

        {mutation.isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm font-semibold text-destructive">{t('persona.error_title')}</p>
            <button
              type="button"
              onClick={() => mutation.mutate()}
              className="mt-2 text-xs font-semibold text-destructive underline"
            >
              {t('persona.retry')}
            </button>
          </div>
        )}
      </div>

      {step === 1 && (
        <div className="sticky bottom-0 -mx-4 border-t border-border bg-background p-4">
          <Button className="w-full" disabled={!theme || !detail} onClick={() => setStep(2)}>
            <ChevronRight className="h-3.5 w-3.5" />
            {t('persona.review_selection')}
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="sticky bottom-0 -mx-4 border-t border-border bg-background p-4 py-3">
          <Button className="w-full" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {mutation.isPending ? t('persona.generating') : t('persona.generate')}
          </Button>
        </div>
      )}
    </div>
  )
}
