import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Map, Share2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { RouteMiniMap } from '@/blocks/route/route-mini-map'
import { RouteLocationCheck } from '@/blocks/route/route-location-check'
import { RouteStopList } from '@/blocks/route/route-stop-list'
import { DocentPlayer } from '@/blocks/persona/docent-player'
import { readRouteDraft, saveRouteDraft, readPersonaRoutePlan, clearPersonaRoutePlan, type RouteStop } from '@/lib/route-draft'
import { encodeRouteForShare, decodeRouteFromShare } from '@/lib/route-share'
import { usePageHelpStore } from '@/store/page-help-store'
import { useRouteProgressStore } from '@/store/route-progress-store'
import type { MapFocusState } from './MapPage'
import type { RoutePlan } from '@/lib/route-timing'

interface MinimapBounds { minLat: number; maxLat: number; minLng: number; maxLng: number }

function buildMinimapBounds(stops: RouteStop[]): MinimapBounds | null {
  if (stops.length === 0) return null
  return stops.reduce<MinimapBounds>(
    (b, s) => ({
      minLat: Math.min(b.minLat, s.lat),
      maxLat: Math.max(b.maxLat, s.lat),
      minLng: Math.min(b.minLng, s.lng),
      maxLng: Math.max(b.maxLng, s.lng),
    }),
    { minLat: stops[0].lat, maxLat: stops[0].lat, minLng: stops[0].lng, maxLng: stops[0].lng },
  )
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
  const [minimapBounds] = useState<MinimapBounds | null>(() => buildMinimapBounds(initialRoute.stops))
  const completedIds = useRouteProgressStore((s) => s.completedIds)
  const toggleCompleteProgress = useRouteProgressStore((s) => s.toggleComplete)
  const removeStopProgress = useRouteProgressStore((s) => s.removeStop)
  const clearProgress = useRouteProgressStore((s) => s.clear)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [personaPlan, setPersonaPlan] = useState<RoutePlan | null>(() => readPersonaRoutePlan())
  const [docentOpen, setDocentOpen] = useState(false)

  useEffect(() => {
    setHelp(t('route.help_title'), t('route.help_body'))
    return () => clearHelp()
  }, [setHelp, clearHelp, t])

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
    const state: MapFocusState = {
      focusPlaces: [{ id: stop.id, name: stop.name, category: 'culture', address: stop.address, lat: stop.lat, lng: stop.lng, tags: stop.tags }],
      openDetail: true,
    }
    navigate('../map', { state })
  }

  function viewAllOnMap() {
    if (stops.length === 0) return
    const state: MapFocusState = {
      focusPlaces: stops.map((s) => ({ id: s.id, name: s.name, category: 'culture', address: s.address, lat: s.lat, lng: s.lng, tags: s.tags })),
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
      <div className="mx-auto flex w-full flex-col items-center justify-center gap-2 px-4 py-16 text-center md:max-w-2xl">
        <p className="text-sm font-semibold text-foreground">{t('route.empty_title')}</p>
        <p className="text-xs text-muted-foreground">{t('route.empty_desc')}</p>
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

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: t("route.stops"), value: String(stops.length) },
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
            {minimapBounds && <RouteMiniMap stops={stops} completedIds={completedIds} bounds={minimapBounds} />}
            <RouteLocationCheck
              key={nextIncompleteStop?.id}
              nextStop={nextIncompleteStop}
            />
          </div>

          <RouteStopList
            stops={stops}
            completedIds={completedIds}
            onDragEnd={handleDragEnd}
            onToggleComplete={toggleComplete}
            onRemove={removeStop}
            onViewOnMap={viewStopOnMap}
            onDocent={personaPlan ? () => setDocentOpen(true) : undefined}
          />
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-2 border-t border-border bg-background p-4">
        <Button className="flex-1" onClick={viewAllOnMap}>
          <Map className="h-3.5 w-3.5" />
          {t("route.open_route_map")}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={shareRoute}
          aria-label={t("route.share")}
          title={t("route.share")}
        >
          <Share2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setClearConfirmOpen(true)}
          aria-label={t("route.clear_route")}
          title={t("route.clear_route")}
        >
          <Trash2 className="h-4 w-4" />
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
