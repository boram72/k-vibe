import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { RouteStopCard } from '@/blocks/route/route-stop-card'
import type { RouteStop } from '@/lib/route-draft'

interface RouteStopListProps {
  stops: RouteStop[]
  completedIds: Set<string>
  onDragEnd: (event: DragEndEvent) => void
  onToggleComplete: (id: string) => void
  onRemove: (id: string) => void
  onViewOnMap: (stop: RouteStop) => void
  onDocent?: (stop: RouteStop) => void
}

export function RouteStopList({
  stops,
  completedIds,
  onDragEnd,
  onToggleComplete,
  onRemove,
  onViewOnMap,
  onDocent,
}: RouteStopListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  )

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 md:space-y-2">
          {stops.map((stop, idx) => (
            <RouteStopCard
              key={stop.id}
              stop={stop}
              index={idx}
              isCompleted={completedIds.has(stop.id)}
              onToggleComplete={() => onToggleComplete(stop.id)}
              onRemove={() => onRemove(stop.id)}
              onViewOnMap={() => onViewOnMap(stop)}
              onDocent={onDocent && stop.fromPersona ? () => onDocent(stop) : undefined}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
