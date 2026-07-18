import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock, PlayCircle, Route as RouteIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { readRouteDraft } from '@/lib/route-draft'
import { scheduleRoute, calculateRouteLegs, DEFAULT_STAY_MINUTES } from '@/lib/route-schedule'
import { formatDuration } from '@/lib/route-timing'
import { useRouteProgressStore } from '@/store/route-progress-store'

export function CurrentRouteCard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // Lazy initializer — one-time local read, same pattern as RoutePage's own mount.
  const [stops] = useState(() => readRouteDraft())
  // Reactive (not a snapshot) — shared with RoutePage via the same store, so
  // toggling a stop's completion here or there stays in sync either way.
  const completedIds = useRouteProgressStore((s) => s.completedIds)
  const toggleComplete = useRouteProgressStore((s) => s.toggleComplete)

  if (stops.length === 0) {
    return (
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <RouteIcon className="h-4 w-4 text-primary" />
            {t('profile.saved_routes')}
          </p>
        </div>
        <div className="p-6 text-center">
          <p className="text-sm text-muted-foreground">{t('profile.no_saved_routes')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('profile.no_saved_routes_hint')}</p>
          <Button className="mt-4" onClick={() => navigate('../map')}>
            {t('profile.create_first_route')}
          </Button>
        </div>
      </section>
    )
  }

  const scheduled = scheduleRoute(stops, DEFAULT_STAY_MINUTES)
  const legs = calculateRouteLegs(stops)
  const walking = legs.reduce((total, leg) => total + leg.travelMinutes, 0)
  const stay = stops.reduce((total, s) => total + (s.stayMinutes ?? DEFAULT_STAY_MINUTES), 0)
  const doneCount = stops.filter((s) => completedIds.has(s.id)).length
  const progressPercent = Math.round((doneCount / stops.length) * 100)
  const nextStop = scheduled.find((sched) => !completedIds.has(sched.stop.id))

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          <RouteIcon className="h-4 w-4 text-primary" />
          {t('profile.saved_routes')}
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate('../route')}
        className="block w-full p-4 text-left transition-colors hover:bg-accent"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-foreground">{t('profile.current_route')}</p>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            {progressPercent}%
          </span>
        </div>

        <div className="mb-1 mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3" />
            {t('profile.route_progress', { done: doneCount, total: stops.length })}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {formatDuration(walking + stay)}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-crowd-low transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </button>

      <div className="flex items-center gap-2 px-4 pb-3">
        <div className="min-w-0 flex-1 rounded-lg bg-muted p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {nextStop ? t('profile.next_stop') : t('profile.route_complete')}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">
            {nextStop?.stop.name ?? stops[stops.length - 1]?.name}
          </p>
        </div>
        {nextStop && (
          // `nextStop` is by definition the first stop NOT in completedIds,
          // so this button only ever marks it complete (never the reverse) —
          // un-completing a stop is RouteStopCard's job, not this summary card's.
          <button
            type="button"
            onClick={() => toggleComplete(nextStop.stop.id)}
            aria-label={t('route.mark_complete', { name: nextStop.stop.name })}
            className="shrink-0 rounded-lg p-3 text-muted-foreground transition-colors hover:bg-accent hover:text-crowd-low"
          >
            <CheckCircle2 className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="p-4 pt-0">
        <Button className="w-full" onClick={() => navigate('../route')}>
          <PlayCircle className="h-3.5 w-3.5" />
          {t('profile.continue_route')}
        </Button>
      </div>
    </section>
  )
}
