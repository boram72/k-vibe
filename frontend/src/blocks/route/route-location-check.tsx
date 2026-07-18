import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LocateFixed } from 'lucide-react'
import { haversineKm } from '@/lib/haversine'
import type { RouteStop } from '@/lib/route-draft'
import { cn } from '@/lib/utils'

interface RouteLocationCheckProps {
  nextStop: RouteStop | null
}

interface LocationCheckState {
  loading: boolean
  message: string
  tone: 'neutral' | 'success' | 'error'
}

function formatLegDistance(meters: number): string {
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`
}

const TONE_CLASS: Record<LocationCheckState['tone'], string> = {
  neutral: 'text-muted-foreground',
  success: 'text-crowd-low',
  error: 'text-destructive',
}

export function RouteLocationCheck({ nextStop }: RouteLocationCheckProps) {
  const { t } = useTranslation()
  // RoutePage remounts this component (via `key={nextStop?.id}`) whenever the
  // next stop changes, so this initial value doubles as the reset — no
  // effect needed to "re-sync" it after the fact.
  const [check, setCheck] = useState<LocationCheckState>({ loading: false, message: '', tone: 'neutral' })

  function checkDistance() {
    if (!nextStop) {
      setCheck({ loading: false, message: t('route.route_completed'), tone: 'success' })
      return
    }
    if (!navigator.geolocation) {
      setCheck({ loading: false, message: t('route.location_unsupported'), tone: 'error' })
      return
    }

    setCheck({ loading: true, message: t('route.checking_location'), tone: 'neutral' })
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const distanceM = Math.round(
          haversineKm(position.coords.latitude, position.coords.longitude, nextStop.lat, nextStop.lng) * 1000,
        )
        const distance = formatLegDistance(distanceM)
        const near = distanceM <= 100
        setCheck({
          loading: false,
          message: t(near ? 'route.next_stop_near' : 'route.next_stop_far', { distance, name: nextStop.name }),
          tone: near ? 'success' : 'neutral',
        })
      },
      (error) => {
        setCheck({
          loading: false,
          message: t(
            error.code === error.PERMISSION_DENIED ? 'route.location_permission_denied' : 'route.location_check_error',
          ),
          tone: 'error',
        })
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 300_000 },
    )
  }

  return (
    <section className="rounded-xl border border-border bg-muted p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <LocateFixed className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">{t('route.location_card_title')}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {nextStop ? t('route.location_card_body', { name: nextStop.name }) : t('route.route_completed')}
          </p>
          {check.message && <p className={cn('mt-2 text-xs font-semibold', TONE_CLASS[check.tone])}>{check.message}</p>}
        </div>
        <button
          type="button"
          onClick={checkDistance}
          disabled={check.loading}
          className="shrink-0 rounded-xl bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-50"
        >
          {check.loading ? t('route.checking_location') : t('route.check_location')}
        </button>
      </div>
    </section>
  )
}
