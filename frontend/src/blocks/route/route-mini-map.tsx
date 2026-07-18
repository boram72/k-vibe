import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPinned, Navigation } from 'lucide-react'
import type { RouteStop } from '@/lib/route-draft'
import { buildGoogleMapsDirectionsUrl, buildGoogleMapsPlaceUrl } from '@/lib/route-share'
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
}

export function RouteMiniMap({ stops, completedIds, bounds }: RouteMiniMapProps) {
  const { t } = useTranslation()
  const [pan, setPan] = useState({ x: 0, y: 0 })
  // dragRef is only read in event handlers — never during render, safe for react-hooks/refs
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)

  if (stops.length === 0) return null

  const minSpan = 0.015
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, minSpan)
  const lngSpan = Math.max(bounds.maxLng - bounds.minLng, minSpan)
  const centerLat = (bounds.maxLat + bounds.minLat) / 2
  const centerLng = (bounds.maxLng + bounds.minLng) / 2
  const pad = 0.15
  const minLat = centerLat - (latSpan / 2) * (1 + pad)
  const maxLat = centerLat + (latSpan / 2) * (1 + pad)
  const minLng = centerLng - (lngSpan / 2) * (1 + pad)
  const maxLng = centerLng + (lngSpan / 2) * (1 + pad)
  const latRange = maxLat - minLat
  const lngRange = maxLng - minLng

  const points = stops.map((stop) => ({
    stop,
    x: ((stop.lng - minLng) / lngRange) * 100,
    y: ((maxLat - stop.lat) / latRange) * 100,
  }))
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ')
  const directionsUrl = buildGoogleMapsDirectionsUrl(stops)

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
    <section
      className="rounded-xl border border-border bg-muted p-3"
      aria-label={t('route.mini_map_title')}
    >
      <div className="mb-3 flex items-center gap-1">
        <MapPinned className="h-4.5 w-4.5 shrink-0 text-primary" />
        <h3 className="text-sm font-bold text-foreground">{t('route.mini_map_title')}</h3>
        <p className="ml-1 text-xs text-muted-foreground">{t('route.mini_map_subtitle')}</p>
      </div>

      <div className="relative aspect-video overflow-hidden rounded-xl bg-background">
        {/* Draggable layer — pointer events handled here so pins can still be tapped */}
        <div
          className="absolute inset-0 cursor-grab select-none active:cursor-grabbing"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
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
                className={cn(
                  'absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-background text-xs font-bold shadow-lg transition-transform hover:scale-105',
                  isCompleted ? 'bg-crowd-low text-white' : 'bg-primary text-primary-foreground',
                )}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              >
                {index + 1}
              </a>
            )
          })}
        </div>

        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 rounded-lg bg-background/90 px-2.5 py-1.5 text-xs font-semibold text-primary shadow backdrop-blur hover:bg-background"
          >
            <Navigation className="h-3.5 w-3.5" />
            {t('route.open_directions')}
          </a>
        )}
      </div>
    </section>
  )
}
