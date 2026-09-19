import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Share2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { RouteMiniMap } from '@/blocks/route/route-mini-map'
import { RouteLocationCheck } from '@/blocks/route/route-location-check'
import { RouteStopList } from '@/blocks/route/route-stop-list'
import { EmptyRouteGuide } from '@/blocks/route/empty-route-guide'
import { DocentPlayer } from '@/blocks/persona/docent-player'
import { readRouteDraft, saveRouteDraft, readPersonaRoutePlan, clearPersonaRoutePlan, type RouteStop } from '@/lib/route-draft'
import { encodeRouteForShare, decodeRouteFromShare } from '@/lib/route-share'
import { haversineKm } from '@/lib/haversine'
import { usePageHelpStore } from '@/store/page-help-store'
import { useRouteProgressStore } from '@/store/route-progress-store'
import { useTourStore, canAutoStartTour, markTourSeen } from '@/store/tour-store'
import { ROUTE_TOUR_KEY, ROUTE_TOUR_STEPS } from '@/blocks/tour/tour-steps'
import { EmptyRouteNotice } from '@/blocks/route/empty-route-notice'

// 비어있는 내 루트 첫 진입 안내 팝업의 "이미 봤는지" 플래그 이름 — 투어와 같은
// 저장소(tour-store의 seen 플래그)를 재사용한다.
const ROUTE_EMPTY_NOTICE_KEY = 'route-empty'
import type { MapFocusState } from './MapPage'
import type { RoutePlan } from '@/lib/route-timing'

interface MinimapBounds { minLat: number; maxLat: number; minLng: number; maxLng: number }

function buildMinimapBounds(stops: RouteStop[]): MinimapBounds | null {
  const validStops = stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
  if (validStops.length === 0) return null
  return validStops.reduce<MinimapBounds>(
    (b, s) => ({
      minLat: Math.min(b.minLat, s.lat),
      maxLat: Math.max(b.maxLat, s.lat),
      minLng: Math.min(b.minLng, s.lng),
      maxLng: Math.max(b.maxLng, s.lng),
    }),
    { minLat: validStops[0].lat, maxLat: validStops[0].lat, minLng: validStops[0].lng, maxLng: validStops[0].lng },
  )
}

function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`
}

function totalRouteDistanceM(stops: RouteStop[]): number {
  let total = 0
  for (let i = 0; i < stops.length - 1; i++) {
    total += haversineKm(stops[i].lat, stops[i].lng, stops[i + 1].lat, stops[i + 1].lng) * 1000
  }
  return total
}

function loadInitialRoute(searchParams: URLSearchParams) {
  const sharedParam = searchParams.get('route')
  if (sharedParam) {
    const decoded = decodeRouteFromShare(sharedParam)
    if (decoded) {
      return { stops: decoded, shareStatus: 'loaded' as const }
    }
    return { stops: readRouteDraft(), shareStatus: 'invalid' as const }
  }
  return { stops: readRouteDraft(), shareStatus: null }
}

export default function RoutePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const setHelp = usePageHelpStore((s) => s.setHelp)
  const clearHelp = usePageHelpStore((s) => s.clearHelp)

  const [initialRoute] = useState(() => loadInitialRoute(searchParams))
  const [stops, setStops] = useState<RouteStop[]>(initialRoute.stops)
  const minimapBounds = useMemo<MinimapBounds | null>(() => buildMinimapBounds(stops), [stops])
  const completedIds = useRouteProgressStore((s) => s.completedIds)
  const toggleCompleteProgress = useRouteProgressStore((s) => s.toggleComplete)
  const removeStopProgress = useRouteProgressStore((s) => s.removeStop)
  const clearProgress = useRouteProgressStore((s) => s.clear)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  // 비어있는 내 루트에 "처음" 들어왔을 때만 처음부터 열린 채로 시작(아래 이펙트 참고).
  // 렌더 중에는 저장소를 읽기만 하고(canAutoStartTour), "봤다"는 표시는 이펙트에서 쓴다.
  const [emptyNoticeOpen, setEmptyNoticeOpen] = useState(
    () => initialRoute.stops.length === 0 && canAutoStartTour(ROUTE_EMPTY_NOTICE_KEY),
  )
  const [personaPlan, setPersonaPlan] = useState<RoutePlan | null>(() => readPersonaRoutePlan())
  const [docentOpen, setDocentOpen] = useState(false)
  // 2026-09 — "현재 거리" 확인(RouteLocationCheck) 결과를 미니맵의 "내 위치"
  // 핀으로도 보여준다. 페이지 진입만으로 위치 권한을 요청하지 않도록 null로
  // 시작(사용자가 버튼을 눌러야만 채워짐).
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const activeTourKey = useTourStore((s) => s.activeTourKey)
  const tourStepIndex = useTourStore((s) => s.stepIndex)
  const tourNext = useTourStore((s) => s.next)
  const startTour = useTourStore((s) => s.start)

  useEffect(() => {
    setHelp(t('route.help_title'), t('route.help_body'))
    return () => clearHelp()
  }, [setHelp, clearHelp, t])

  // 루트에 장소가 처음 채워진 순간에만 투어를 띄운다 — 빈 화면일 때는
  // EmptyRouteGuide가 이미 "추가하는 방법"을 안내하고 있어서, 이 투어는
  // "이미 채워진 루트를 편집하는 법"만 다룬다(사용자 확인, localStorage
  // 플래그로 최초 1회만).
  useEffect(() => {
    if (stops.length > 0 && canAutoStartTour(ROUTE_TOUR_KEY)) startTour(ROUTE_TOUR_KEY)
  }, [stops.length, startTour])

  // 비어있는 내 루트에 처음 들어왔을 때는 투어 대신 "장소를 먼저 추가해 보세요"
  // 안내 팝업을 한 번만 띄운다(사용자 요청). 처음 진입 시점에 이미 비어있던
  // 경우만 해당 — 나중에 직접 장소를 다 지워서 비게 된 경우엔 띄우지 않는다.
  // "?" 버튼(help-button.tsx)으로 다시 여는 경우는 별개(항상 뜸). 팝업이 열린
  // 채로 시작했다면 그 순간 "봤다"고 표시해서 다음 진입부터는 안 뜨게 한다.
  useEffect(() => {
    if (emptyNoticeOpen) markTourSeen(ROUTE_EMPTY_NOTICE_KEY)
  }, [emptyNoticeOpen])

  useEffect(() => {
    if (initialRoute.shareStatus === 'loaded') {
      saveRouteDraft(initialRoute.stops)
      toast.success(t('route.shared_route_loaded'))
      setSearchParams(
        (prev) => {
          prev.delete('route')
          return prev
        },
        { replace: true },
      )
    } else if (initialRoute.shareStatus === 'invalid') {
      toast.warning(t('route.shared_route_invalid'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    saveRouteDraft(stops)
  }, [stops])

  const stats = { done: completedIds.size }
  const totalDistanceM = useMemo(() => totalRouteDistanceM(stops), [stops])

  const nextIncompleteStop = stops.find((s) => !completedIds.has(s.id)) ?? null

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setStops((prev) => {
      const fromIdx = prev.findIndex((s) => s.id === active.id)
      const toIdx = prev.findIndex((s) => s.id === over.id)
      if (fromIdx === -1 || toIdx === -1) return prev
      return arrayMove(prev, fromIdx, toIdx)
    })
    toast.success(t('route.order_updated'))
    // 드래그는 클릭 이벤트가 안 나서(tour-overlay.tsx의 advanceOnClick 참고)
    // 실제로 순서 바꾸기가 성공한 이 시점에 직접 투어를 다음 단계로 넘긴다.
    if (activeTourKey === ROUTE_TOUR_KEY && ROUTE_TOUR_STEPS[tourStepIndex]?.target === 'route-drag-handle') {
      tourNext(ROUTE_TOUR_STEPS.length)
    }
  }

  function removeStop(id: string) {
    setStops((prev) => prev.filter((s) => s.id !== id))
    removeStopProgress(id)
    toast.warning(t('route.stop_removed'))
  }

  function toggleComplete(id: string) {
    const wasCompleted = completedIds.has(id)
    toggleCompleteProgress(id)
    toast.success(wasCompleted ? t('route.stop_reopened') : t('route.stop_completed'))
  }

  function viewStopOnMap(stop: RouteStop) {
    // stop.id는 "루트 안의 이 스팟 한 장"을 가리키는 인스턴스 id라 PersonaPage에서
    // 반복 추가 시 타임스탬프가 붙는다(`${s.id}-${ts}`) — 리뷰/평점/상세정보는 전부
    // 실제 장소 식별자인 stop.placeId 기준으로 조회되므로, 지도로 넘길 Place.id는
    // stop.id가 아니라 stop.placeId(없으면 stop.id로 폴백)를 써야 한다.
    // place-detail-sheet.tsx의 사진은 GET /places/{id}가 아니라 이 Place.imageUrl을
    // 그대로 쓰므로, 여기서 안 넘기면 phone/hours/리뷰는 정상인데 사진만 항상 빈
    // 플레이스홀더로 보이는 버그가 있었다.
    const state: MapFocusState = {
      focusPlaces: [{ id: stop.placeId ?? stop.id, name: stop.name, category: 'culture', address: stop.address, lat: stop.lat, lng: stop.lng, tags: stop.tags, imageUrl: stop.imageUrl }],
      openDetail: true,
      returnToRoute: true,
    }
    navigate('../map', { state })
  }

  async function shareRoute() {
    if (stops.length === 0) return
    const encoded = encodeRouteForShare(stops)
    const shareUrl = `${window.location.origin}${window.location.pathname}?route=${encoded}`
    const shareText = stops.map((s) => s.name).join(' -> ')

    try {
      if (navigator.share) {
        await navigator.share({ title: t('route.title'), text: shareText, url: shareUrl })
        toast.success(t('route.shared'))
        return
      }
      await navigator.clipboard.writeText(shareUrl)
      toast.success(t('route.copied'))
    } catch {
      toast.error(t('route.share_unavailable'))
    }
  }

  function clearRoute() {
    setStops([])
    clearProgress()
    clearPersonaRoutePlan()
    setPersonaPlan(null)
    setClearConfirmOpen(false)
    toast.success(t('route.cleared'))
  }

  if (stops.length === 0) {
    return (
      <div className="mx-auto flex w-full flex-col items-center gap-2 px-4 py-16 text-center md:max-w-2xl">
        <p className="text-sm font-semibold text-foreground">{t('route.empty_title')}</p>
        <p className="text-xs text-muted-foreground">{t('route.empty_desc')}</p>
        <EmptyRouteGuide />
        <EmptyRouteNotice open={emptyNoticeOpen} onOpenChange={setEmptyNoticeOpen} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-full w-full flex-col px-4 md:max-w-6xl">
      <div className="flex-1 space-y-4 py-4">
        <div>
          <h2 className="mt-0.5 text-lg font-bold text-foreground">
            {t("route.title")}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {t("route.helper")}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t("route.stops"), value: String(stops.length) },
            { label: t("route.total_distance"), value: formatDistance(totalDistanceM) },
            { label: t("route.done"), value: `${stats.done}/${stops.length}` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-muted p-3 text-center">
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="text-sm font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_480px] md:items-start">
          <div className="space-y-4">
            {minimapBounds && (
              <RouteMiniMap
                stops={stops}
                completedIds={completedIds}
                bounds={minimapBounds}
                currentLocation={currentLocation}
              />
            )}
            <RouteLocationCheck
              key={nextIncompleteStop?.id}
              nextStop={nextIncompleteStop}
              onLocationChecked={setCurrentLocation}
            />
          </div>

          <RouteStopList
            stops={stops}
            completedIds={completedIds}
            onDragEnd={handleDragEnd}
            onToggleComplete={toggleComplete}
            onRemove={removeStop}
            onViewOnMap={viewStopOnMap}
            // 2026-09 태스크보드 7번: 도슨트 버튼 숨김. 되돌리려면 undefined를
            // `personaPlan ? () => setDocentOpen(true) : undefined`로 복구
            onDocent={undefined}
          />
        </div>
      </div>

      <div data-tour="route-actions" className="sticky bottom-0 -mx-4 flex items-center gap-2 border-t border-border bg-background p-4">
        <Button variant="outline" className="flex-1" onClick={shareRoute}>
          <Share2 className="h-3.5 w-3.5" />
          {t("route.share")}
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => setClearConfirmOpen(true)}>
          <Trash2 className="h-3.5 w-3.5" />
          {t("route.clear_route")}
        </Button>
      </div>

      {personaPlan && (
        <DocentPlayer open={docentOpen} onClose={() => setDocentOpen(false)} plan={personaPlan} />
      )}

      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="p-6 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("route.clear_route")}</DialogTitle>
            <DialogDescription>
              {t("route.clear_route_confirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setClearConfirmOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={clearRoute}>
              {t("route.clear_route")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
