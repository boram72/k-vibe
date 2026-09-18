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
  // 그대로 유지하기 위함. 토글을 끄면 null을 넘겨 미니맵의 "내 위치" 핀을
  // 지우고 지도를 루트 기준 bounds로 되돌린다(RouteMiniMap의 currentLocation
  // 의존 useEffect가 자동으로 다시 fit).
  onLocationChecked?: (coords: { lat: number; lng: number } | null) => void
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
  // 2026-09 대화 중 요청 — 버튼을 토글로 변경. 켜면 기존 checkDistance()와
  // 동일 동작(GPS 조회+미니맵에 내 위치 핀). 끄면(재클릭) 로컬 메시지/버튼
  // 상태를 리셋하고 onLocationChecked(null)로 부모에도 알려 미니맵의 내 위치
  // 핀을 지우고 지도를 루트 기준으로 되돌린다. 버튼 하나로 유지하되 눌린
  // 상태를 배경색으로 표시(별도 Switch+라벨로 분리하면 안내문구 등장 시
  // 레이아웃이 흔들려 보인다는 피드백으로 버튼 단일 요소 유지 확정).
  const [enabled, setEnabled] = useState(false)

  function handleToggle(next: boolean) {
    setEnabled(next)
    if (next) {
      checkDistance()
    } else {
      setCheck({ loading: false, message: '', tone: 'neutral' })
      onLocationChecked?.(null)
    }
  }

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
    <section data-tour="route-location-check" className="rounded-xl border border-border bg-muted p-3">
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
          onClick={() => handleToggle(!enabled)}
          disabled={check.loading}
          aria-pressed={enabled}
          className={cn(
            'shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-50',
            enabled ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background text-foreground hover:bg-accent',
          )}
        >
          {check.loading ? t('route.checking_location') : t('route.check_location')}
        </button>
      </div>
    </section>
  )
}
