import { useTranslation } from 'react-i18next'
import { Plus, RotateCcw, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CrowdBadge } from '@/blocks/common/crowd-badge'
import type { RoutePlan } from '@/lib/route-timing'

interface RouteResultProps {
  plan: RoutePlan
  onReset: () => void
  onAddToRoute: () => void
  onShare: () => void
}

export function RouteResult({ plan, onReset, onAddToRoute, onShare }: RouteResultProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary">{t('persona.preview_eyebrow')}</p>
          <h2 className="mt-0.5 text-lg font-bold text-foreground">{plan.title}</h2>
        </div>
        <button
          type="button"
          onClick={onReset}
          aria-label={t('persona.create_another')}
          title={t('persona.create_another')}
          className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {plan.stops.map((stop, index) => (
          <div key={stop.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </div>
              {index < plan.stops.length - 1 && <div className="my-1 min-h-4 w-px flex-1 bg-border" />}
            </div>

            <div className="mb-1 flex-1 rounded-xl border border-border bg-muted p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-semibold text-foreground">{stop.name}</p>
                <CrowdBadge level={stop.crowdLevel} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{stop.address}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground/90">{stop.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={onAddToRoute}>
          <Plus className="h-3.5 w-3.5" />
          {t('persona.add_to_route')}
        </Button>
        <Button variant="outline" onClick={onShare}>
          <Share2 className="h-3.5 w-3.5" />
          {t('persona.share')}
        </Button>
      </div>
    </div>
  )
}
