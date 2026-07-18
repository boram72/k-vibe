import { useTranslation } from 'react-i18next'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CheckCircle2, ExternalLink, GripVertical, Headphones, MapPin, X } from 'lucide-react'
import { CrowdBadge } from '@/blocks/common/crowd-badge'
import type { RouteStop } from '@/lib/route-draft'
import { buildGoogleMapsPlaceUrl } from '@/lib/route-share'
import { cn } from '@/lib/utils'

interface RouteStopCardProps {
  stop: RouteStop
  index: number
  isCompleted: boolean
  onToggleComplete: () => void
  onRemove: () => void
  onViewOnMap: () => void
  onDocent?: () => void
}

export function RouteStopCard({
  stop,
  index,
  isCompleted,
  onToggleComplete,
  onRemove,
  onViewOnMap,
  onDocent,
}: RouteStopCardProps) {
  const { t } = useTranslation()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const completeBtn = (
    <button
      type="button"
      onClick={onToggleComplete}
      aria-pressed={isCompleted}
      aria-label={t(isCompleted ? 'route.mark_incomplete' : 'route.mark_complete', { name: stop.name })}
      className={cn(
        'rounded-lg p-1.5 transition-colors hover:bg-accent',
        isCompleted ? 'text-crowd-low' : 'text-muted-foreground',
      )}
    >
      <CheckCircle2 className="h-4.5 w-4.5" />
    </button>
  )

  const viewOnMapBtn = (
    <button
      type="button"
      onClick={onViewOnMap}
      aria-label={t('route.open_stop_detail', { name: stop.name })}
      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent"
    >
      <MapPin className="h-4.5 w-4.5" />
    </button>
  )

  const externalLinkBtn = (
    <a
      href={buildGoogleMapsPlaceUrl(stop)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('route.open_stop_map', { name: stop.name })}
      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent"
    >
      <ExternalLink className="h-4.5 w-4.5" />
    </a>
  )

  const removeBtn = (
    <button
      type="button"
      onClick={onRemove}
      aria-label={t('route.remove_stop', { name: stop.name })}
      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent"
    >
      <X className="h-4.5 w-4.5" />
    </button>
  )

  const docentBtn = stop.fromPersona && onDocent ? (
    <button
      type="button"
      onClick={onDocent}
      aria-label={t('route.docent')}
      title={t('route.docent')}
      className="rounded-lg p-1.5 text-primary transition-colors hover:bg-accent"
    >
      <Headphones className="h-4.5 w-4.5" />
    </button>
  ) : null

  const dragHandle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label={t('route.drag_handle')}
      className="shrink-0 cursor-grab touch-none rounded-lg p-1 text-muted-foreground active:cursor-grabbing"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  )

  const nameAndBadge = (
    <div className="flex flex-nowrap items-center gap-1.5">
      <p
        className={cn(
          'min-w-0 truncate text-sm font-semibold text-foreground',
          isCompleted && 'text-muted-foreground line-through',
        )}
      >
        {stop.name}
      </p>
      {stop.crowdLevel && <CrowdBadge level={stop.crowdLevel} />}
    </div>
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-xl border bg-muted px-3 py-4 transition-colors md:px-2 md:py-3',
        isCompleted ? 'border-crowd-low/30 bg-crowd-low/5' : 'border-border',
        isDragging && 'opacity-40',
      )}
    >
      {/* Mobile layout */}
      <div className="flex items-start gap-3 md:hidden">
        {dragHandle}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start gap-2">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-primary-foreground',
                isCompleted ? 'bg-crowd-low' : 'bg-primary',
              )}
            >
              {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
            </div>
            <div className="min-w-0 flex-1">
              {nameAndBadge}
              <p className="mt-1 text-xs text-muted-foreground">{stop.category}</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            {docentBtn}
            {completeBtn}
            {viewOnMapBtn}
            {externalLinkBtn}
            {removeBtn}
          </div>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden items-center gap-2 md:flex">
        {dragHandle}
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-primary-foreground',
            isCompleted ? 'bg-crowd-low' : 'bg-primary',
          )}
        >
          {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
        </div>
        <div className="min-w-0 flex-1">
          {nameAndBadge}
          <p className="mt-0.5 text-xs text-muted-foreground">{stop.category}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {docentBtn}
          {completeBtn}
          {viewOnMapBtn}
          {externalLinkBtn}
          {removeBtn}
        </div>
      </div>
    </div>
  )
}
