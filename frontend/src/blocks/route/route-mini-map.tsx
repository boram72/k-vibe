import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CustomOverlayMap, Map as KakaoMap, Polyline, useKakaoLoader } from 'react-kakao-maps-sdk'
import { MapPinned } from 'lucide-react'
import type { RouteStop } from '@/lib/route-draft'
import { buildGoogleMapsPlaceUrl } from '@/lib/route-share'
import { CurrentLocationPin } from '@/blocks/common/current-location-pin'
import { cn } from '@/lib/utils'

export interface MinimapBounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

interface RouteMiniMapProps {
  stops: RouteStop[]
  completedIds: Set<string>
  bounds: MinimapBounds
  // 2026-09 — "현재 거리" 확인(RouteLocationCheck) 버튼을 눌러 실제 GPS 좌표를
  // 얻은 뒤에만 채워짐(페이지 진입만으로 위치 권한을 자동 요청하지 않기 위해
  // on-demand로 유지). 없으면(null/undefined) 핀을 안 그린다.
  currentLocation?: { lat: number; lng: number } | null
}

interface Coordinates {
  lat: number
  lng: number
}

function hasValidCoordinates(stop: RouteStop): boolean {
  return Number.isFinite(stop.lat) && Number.isFinite(stop.lng)
}

function getMapCenter(bounds: MinimapBounds): Coordinates {
  return {
    lat: (bounds.maxLat + bounds.minLat) / 2,
    lng: (bounds.maxLng + bounds.minLng) / 2,
  }
}

function getInitialMapLevel(bounds: MinimapBounds): number {
  const span = Math.max(bounds.maxLat - bounds.minLat, bounds.maxLng - bounds.minLng)
  if (span < 0.01) return 4
  if (span < 0.03) return 5
  if (span < 0.08) return 6
  if (span < 0.16) return 7
  return 8
}

function fitKakaoMapToRoute(map: kakao.maps.Map, stops: RouteStop[], center: Coordinates, currentLocation?: Coordinates | null) {
  if (typeof kakao === 'undefined' || !kakao.maps) return

  if (stops.length <= 1 && !currentLocation) {
    // 버그 수정 — setCenter() 먼저 부르고 setLevel()을 나중에 부르면, 레벨을
    // 큰 폭으로 바꿀 때(예: 내 위치 포함 넓은 bounds였다가 스팟 하나로 확
    // 좁혀질 때, 14→4처럼 10단계 이상 점프) 카카오 SDK가 줌 기준점을 다시
    // 잡으면서 center가 실제 목표 좌표에서 최대 1~2km 정도 어긋나는 것을
    // 실측으로 확인함(레벨 변경이 결국 center를 살짝 재계산하는 것으로 보임).
    // 마지막 호출이 항상 이기도록 setLevel을 먼저, setCenter를 나중에 불러
    // 최종 center가 항상 정확한 목표 좌표가 되게 순서를 바꿈.
    map.setLevel(4)
    map.setCenter(new kakao.maps.LatLng(center.lat, center.lng))
    return
  }

  const routeBounds = new kakao.maps.LatLngBounds()
  stops.forEach((stop) => routeBounds.extend(new kakao.maps.LatLng(stop.lat, stop.lng)))
  // "현재 거리" 확인으로 실제 GPS 위치를 얻으면 그 위치도 화면 안에 들어오도록
  // bounds에 같이 포함시킨다(내 위치가 루트에서 멀리 떨어져 있어도 카메라가
  // 알아서 둘 다 보이게 넓혀줌).
  if (currentLocation) routeBounds.extend(new kakao.maps.LatLng(currentLocation.lat, currentLocation.lng))
  map.setBounds(routeBounds, 32, 32, 32, 32)
}

function pinClassName(isCompleted: boolean) {
  return cn(
    'flex h-8 w-8 items-center justify-center rounded-full border border-background text-xs font-bold shadow-lg transition-transform hover:scale-105',
    isCompleted ? 'bg-crowd-low text-white' : 'bg-primary text-primary-foreground',
  )
}

function MapHeader() {
  const { t } = useTranslation()
  return (
    <div className="mb-3 flex items-center gap-1">
      <MapPinned className="h-4.5 w-4.5 shrink-0 text-primary" />
      <h3 className="text-sm font-bold text-foreground">{t('route.mini_map_title')}</h3>
    </div>
  )
}

const PERCENT_ZOOM_MIN = 1
const PERCENT_ZOOM_MAX = 3
const PERCENT_ZOOM_STEP = 0.25

function PercentRouteMiniMap({ stops, completedIds, bounds, currentLocation }: RouteMiniMapProps) {
  const { t } = useTranslation()
  const [pan, setPan] = useState({ x: 0, y: 0 })
  // 2026-09 대화 중 요청 — 카카오맵 경로(scrollwheel 줌)와 동등하게, 폴백
  // 프리뷰도 마우스휠/트랙패드로 줌인/아웃 가능하게 지원.
  const [zoom, setZoom] = useState(1)
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const panLayerRef = useRef<HTMLDivElement | null>(null)

  // 버그 수정 — React의 onWheel prop은 브라우저 스크롤 성능을 위해 리스너를
  // passive: true로 등록해서, 안에서 e.preventDefault()를 불러도 무시되고
  // "Unable to preventDefault inside passive event listener invocation."
  // 콘솔 에러만 남았음(줌 자체는 우연히 동작하지만 페이지 스크롤 차단은 안 됨).
  // ref로 DOM에 직접 { passive: false } 네이티브 리스너를 붙여서 해결 —
  // JSX onWheel prop으로는 passive 옵션을 지정할 방법이 없음.
  useEffect(() => {
    const el = panLayerRef.current
    if (!el) return
    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      setZoom((z) => {
        const next = z - Math.sign(e.deltaY) * PERCENT_ZOOM_STEP
        return Math.min(PERCENT_ZOOM_MAX, Math.max(PERCENT_ZOOM_MIN, next))
      })
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  const minSpan = 0.015
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, minSpan)
  const lngSpan = Math.max(bounds.maxLng - bounds.minLng, minSpan)
  const center = getMapCenter(bounds)
  const pad = 0.15
  const minLat = center.lat - (latSpan / 2) * (1 + pad)
  const maxLat = center.lat + (latSpan / 2) * (1 + pad)
  const minLng = center.lng - (lngSpan / 2) * (1 + pad)
  const maxLng = center.lng + (lngSpan / 2) * (1 + pad)
  const latRange = maxLat - minLat
  const lngRange = maxLng - minLng

  const points = stops.map((stop) => ({
    stop,
    x: ((stop.lng - minLng) / lngRange) * 100,
    y: ((maxLat - stop.lat) / latRange) * 100,
  }))
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ')
  // bounds 자체는 스팟 기준 고정(파일 상단 참고 — 미니맵 핀이 안 튀도록 부모가
  // 소유). 내 위치가 그 범위 밖이어도 화면 가장자리 안쪽(4~96%)에 클램프해서
  // 항상 어느 방향에 있는지는 보이게 한다 — map-canvas.tsx의 percent 폴백
  // 핀과 동일한 클램핑 아이디어.
  const currentLocationPoint = currentLocation
    ? {
        x: Math.max(4, Math.min(96, ((currentLocation.lng - minLng) / lngRange) * 100)),
        y: Math.max(4, Math.min(96, ((maxLat - currentLocation.lat) / latRange) * 100)),
      }
    : null

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return
    setPan({
      x: dragRef.current.panX + e.clientX - dragRef.current.startX,
      y: dragRef.current.panY + e.clientY - dragRef.current.startY,
    })
  }

  function handlePointerUp() {
    dragRef.current = null
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-background">
      <div
        ref={panLayerRef}
        className="absolute inset-0 cursor-grab select-none active:cursor-grabbing"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="absolute inset-0 bg-[linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] bg-size-[36px_36px] opacity-40" />
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline
            points={polyline}
            fill="none"
            stroke="var(--color-primary)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            strokeDasharray="3 3"
          />
        </svg>

        {points.map((point, index) => {
          const isCompleted = completedIds.has(point.stop.id)
          return (
            <a
              key={point.stop.id}
              href={buildGoogleMapsPlaceUrl(point.stop)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('route.open_stop_map', { name: point.stop.name })}
              title={point.stop.name}
              className={cn('absolute -translate-x-1/2 -translate-y-1/2', pinClassName(isCompleted))}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              {index + 1}
            </a>
          )
        })}

        {currentLocationPoint && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${currentLocationPoint.x}%`, top: `${currentLocationPoint.y}%` }}
          >
            <CurrentLocationPin />
          </div>
        )}
      </div>
    </div>
  )
}

function KakaoRouteMiniMap({ stops, completedIds, bounds, currentLocation }: RouteMiniMapProps) {
  const { t } = useTranslation()
  const validStops = useMemo(() => stops.filter(hasValidCoordinates), [stops])
  const mapCenter = useMemo(() => getMapCenter(bounds), [bounds])
  const routePath = useMemo(() => validStops.map((stop) => ({ lat: stop.lat, lng: stop.lng })), [validStops])
  const routeKey = routePath.map((point) => `${point.lat},${point.lng}`).join('|')
  const [map, setMap] = useState<kakao.maps.Map | null>(null)
  const [loading, error] = useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_MAP_KEY,
    url: 'https://dapi.kakao.com/v2/maps/sdk.js',
  })

  useEffect(() => {
    if (error) console.warn('[route] Kakao Maps SDK failed to load, falling back to route preview:', error)
  }, [error])

  useEffect(() => {
    if (!map) return
    fitKakaoMapToRoute(map, validStops, mapCenter, currentLocation)
  }, [map, validStops, mapCenter, routeKey, currentLocation])

  if (loading || error) {
    return (
      <PercentRouteMiniMap stops={validStops} completedIds={completedIds} bounds={bounds} currentLocation={currentLocation} />
    )
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-background">
      <KakaoMap
        center={mapCenter}
        level={getInitialMapLevel(bounds)}
        className="h-full w-full"
        onCreate={setMap}
      >
        {routePath.length > 1 && (
          <Polyline
            path={routePath}
            strokeWeight={4}
            strokeColor="#ff2f62"
            strokeOpacity={0.9}
            strokeStyle="solid"
            zIndex={1}
          />
        )}

        {validStops.map((stop, index) => {
          const isCompleted = completedIds.has(stop.id)
          return (
            <CustomOverlayMap key={stop.id} position={{ lat: stop.lat, lng: stop.lng }} clickable zIndex={2}>
              <a
                href={buildGoogleMapsPlaceUrl(stop)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('route.open_stop_map', { name: stop.name })}
                title={stop.name}
                className={pinClassName(isCompleted)}
              >
                {index + 1}
              </a>
            </CustomOverlayMap>
          )
        })}

        {currentLocation && (
          <CustomOverlayMap position={currentLocation} zIndex={3}>
            <CurrentLocationPin />
          </CustomOverlayMap>
        )}
      </KakaoMap>
    </div>
  )
}

export function RouteMiniMap({ stops, completedIds, bounds, currentLocation }: RouteMiniMapProps) {
  const { t } = useTranslation()
  const validStops = stops.filter(hasValidCoordinates)
  if (validStops.length === 0) return null

  return (
    <section
      className="rounded-xl border border-border bg-muted p-3"
      aria-label={t('route.mini_map_title')}
    >
      <MapHeader />
      {import.meta.env.VITE_KAKAO_MAP_KEY ? (
        <KakaoRouteMiniMap stops={validStops} completedIds={completedIds} bounds={bounds} currentLocation={currentLocation} />
      ) : (
        <PercentRouteMiniMap stops={validStops} completedIds={completedIds} bounds={bounds} currentLocation={currentLocation} />
      )}
    </section>
  )
}
