import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LocateFixed } from 'lucide-react'
import { haversineKm } from '@/lib/haversine'
import type { RouteStop } from '@/lib/route-draft'
import { cn } from '@/lib/utils'

interface RouteLocationCheckProps {
  nextStop: RouteStop | null
  // 2026-09: "현재 거리"를 확인할 때 얻은 실제 GPS 좌표를 부모(RoutePage)로
  // 올려서 미니맵에 "내 위치" 핀으로도 표시한다. 별도로 위치를 다시 요청하지
  // 않고 이 컴포넌트가 이미 하고 있는 온디맨드 조회 결과를 재사용 — 페이지
  // 진입만으로 위치 권한을 묻지 않는 기존 동작(사용자가 버튼을 눌러야 요청)을
  // 그대로 유지하기 위함.
  onLocationChecked?: (coords: { lat: number; lng: number }) => void
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

export function RouteLocationCheck({ nextStop, onLocationChecked }: RouteLocationCheckProps) {
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
        onLocationChecked?.({ lat: position.coords.latitude, lng: position.coords.longitude })
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
