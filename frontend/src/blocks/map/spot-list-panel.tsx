import { useRef, type Dispatch, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Heart, PanelRightClose, PanelRightOpen, Search } from 'lucide-react'
import { CategoryFilter } from '@/blocks/map/category-filter'
import { LoadingSkeleton } from '@/blocks/common/loading-skeleton'
import { CrowdBadge } from '@/blocks/common/crowd-badge'
import { Button } from '@/components/ui/button'
import { getCategoryLabelKey, type Place, type PlaceCategory } from '@/types/place'
import { cn } from '@/lib/utils'

const SWIPE_THRESHOLD = 20

function formatDistance(meters?: number) {
  if (meters === undefined) return ''
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`
}

interface SpotListPanelProps {
  isDesktop: boolean
  isCollapsed: boolean
  onCollapsedChange: Dispatch<SetStateAction<boolean>>
  categories: PlaceCategory[]
  onCategoriesChange: Dispatch<SetStateAction<PlaceCategory[]>>
  search: string
  onSearchChange: Dispatch<SetStateAction<string>>
  showSavedOnly: boolean
  onShowSavedOnlyChange: Dispatch<SetStateAction<boolean>>
  places: Place[]
  isLoading: boolean
  onSelectPlace: (place: Place) => void
}

export function SpotListPanel({
  isDesktop,
  isCollapsed,
  onCollapsedChange,
  categories,
  onCategoriesChange,
  search,
  onSearchChange,
  showSavedOnly,
  onShowSavedOnlyChange,
  places,
  isLoading,
  onSelectPlace,
}: SpotListPanelProps) {
  const { t } = useTranslation()
  const touchStartY = useRef<number | null>(null)

  function resetFilters() {
    onSearchChange('')
    onCategoriesChange(['all'])
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    touchStartY.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (touchStartY.current === null) return
    const delta = e.clientY - touchStartY.current
    if (delta > SWIPE_THRESHOLD) onCollapsedChange(true)
    else if (delta < -SWIPE_THRESHOLD) onCollapsedChange(false)
    touchStartY.current = null
  }

  function renderList() {
    if (isLoading) {
      return (
        <div className="space-y-3 px-4">
          <LoadingSkeleton variant="list" count={4} />
        </div>
      )
    }
    if (places.length === 0) {
      return (
        <div className="space-y-3 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-muted-foreground">{t('map.no_places')}</p>
          <p className="text-xs text-muted-foreground/70">{t('map.no_places_hint')}</p>
          <Button variant="outline" size="sm" onClick={resetFilters}>
            {t('common.retry_btn')}
          </Button>
        </div>
      )
    }
    return places.map((place) => (
      <button
        key={place.id}
        type="button"
        onClick={() => onSelectPlace(place)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{place.name}</p>
          <p className="truncate text-xs text-muted-foreground">{place.address}</p>
          <p className="text-xs text-muted-foreground">{t(getCategoryLabelKey(place.category))}</p>
        </div>
        <div className="shrink-0 text-right">
          {place.distanceM !== undefined && (
            <p className="text-xs font-semibold text-foreground">{formatDistance(place.distanceM)}</p>
          )}
          {place.crowdLevel && <CrowdBadge level={place.crowdLevel} className="mt-1" />}
        </div>
      </button>
    ))
  }

  const savedToggleButton = (
    <Button
      size="icon"
      variant={showSavedOnly ? 'default' : 'outline'}
      onClick={() => onShowSavedOnlyChange((v) => !v)}
      aria-pressed={showSavedOnly}
      aria-label={t('map.show_saved')}
      className="shrink-0"
    >
      <Heart className={cn('h-4 w-4', showSavedOnly && 'fill-current')} />
    </Button>
  )

  const searchAndFilter = (
    <div className="space-y-2 px-4 pb-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('map.search_placeholder')}
            className="w-full rounded-xl border border-border bg-muted py-2 pl-8 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
        </div>
        {savedToggleButton}
      </div>
      <CategoryFilter selected={categories} onChange={onCategoriesChange} />
    </div>
  )

  const titleRow = (
    <div className="flex items-center justify-between px-4 pb-2 pt-1">
      <p className="text-sm font-bold text-foreground">{t('map.nearby_spots')}</p>
      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
        {places.length}
      </span>
    </div>
  )

  const listRegion = <div className="min-h-0 flex-1 overflow-y-auto pb-4">{renderList()}</div>

  return (
    <div
      className={cn(
        "flex flex-col border-t border-border md:border-l md:border-t-0",
        !isDesktop && isCollapsed ? "flex-none" : "min-h-0 flex-3 md:flex-1",
      )}
    >
      {isDesktop && (
        <div className="flex items-center justify-end p-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onCollapsedChange((v) => !v)}
            aria-label={
              isCollapsed ? t("map.expand_panel") : t("map.collapse_panel")
            }
          >
            {isCollapsed ? (
              <PanelRightOpen className="h-4 w-4" />
            ) : (
              <PanelRightClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {isDesktop && isCollapsed ? (
        <div className="flex flex-col items-center gap-2 px-2 pb-4">
          {savedToggleButton}
          <CategoryFilter
            selected={categories}
            onChange={onCategoriesChange}
            collapsed
          />
        </div>
      ) : !isDesktop ? (
        <>
          <div
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            className="touch-none"
          >
            <div className="flex justify-center pb-1 pt-2">
              <div className="h-1 w-10 rounded-full bg-muted" />
            </div>
            {searchAndFilter}
            {titleRow}
          </div>
          {!isCollapsed && listRegion}
        </>
      ) : (
        <>
          {searchAndFilter}
          {titleRow}
          {listRegion}
        </>
      )}
    </div>
  );
}
