import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEP_INTERVAL_MS = 900

// This is a "perceived progress" animation, not real backend progress — it advances
// on a fixed timer and caps at the last step, independent of how long the actual
// analyze request takes (see `loading_cold_start` copy for the "stuck on last step" case).
//
// If the backend (Step 13) ever streams real step/status values (e.g. via SSE or
// polling a job status endpoint), this component could accept a `currentStep: number`
// prop instead of owning its own timer, and the parent would drive it from that real
// status. Not wired now — `fetchAnalysis()` in analyze.data.ts is a single request/response.
export function AnalysisLoading() {
  const { t } = useTranslation()
  const steps = t('analyze.loading_steps', { returnObjects: true }) as string[]
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStepIndex((index) => Math.min(index + 1, steps.length - 1))
    }, STEP_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [steps.length])

  return (
    <div role="status" aria-live="polite" className="space-y-3 rounded-xl border border-border bg-muted p-4">
      <div className="flex items-start gap-2.5">
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-semibold text-foreground">{t('analyze.loading_title')}</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t('analyze.loading_estimate')}</p>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => {
          const complete = i < stepIndex
          const active = i === stepIndex
          return (
            <div key={step} className="flex items-center gap-2">
              {complete ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-crowd-low" />
              ) : active ? (
                <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <div className="h-4 w-4 shrink-0 rounded-full border border-border bg-muted" />
              )}
              <span
                className={cn(
                  'text-xs',
                  active ? 'font-semibold text-foreground' : complete ? 'text-foreground/70' : 'text-muted-foreground',
                )}
              >
                {step}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-xs leading-5 text-muted-foreground">{t('analyze.loading_cold_start')}</p>
    </div>
  )
}
