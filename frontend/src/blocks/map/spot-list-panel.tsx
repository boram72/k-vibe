import { useRef, type Dispatch, type KeyboardEvent, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Heart, Loader2, PanelRightClose, PanelRightOpen, Search, Sparkles } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CategoryFilter } from '@/blocks/map/category-filter'
import { StarFilter } from '@/blocks/map/star-filter'
import { RelatedAttractionsList } from '@/blocks/map/related-attractions-list'
import { LoadingSkeleton } from '@/blocks/common/loading-skeleton'
import { CrowdBadge } from '@/blocks/common/crowd-badge'
import { RatingBadge } from '@/blocks/common/rating-badge'
import { Button } from '@/components/ui/button'
import { getCategoryLabelKey, type Place, type PlaceCategory } from '@/types/place'
import { cn } from '@/lib/utils'

const SWIPE_THRESHOLD = 20
const MOBILE_PANEL_STATES: MobilePanelState[] = ['minimized', 'default', 'full']

function stepMobilePanelState(current: MobilePanelState, direction: 1 | -1): MobilePanelState {
  const nextIndex = MOBILE_PANEL_STATES.indexOf(current) + direction
  return MOBILE_PANEL_STATES[Math.min(MOBILE_PANEL_STATES.length - 1, Math.max(0, nextIndex))]
}

function formatDistance(meters?: number) {
  if (meters === undefined) return ''
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`
}

type MobilePanelState = 'minimized' | 'default' | 'full'

interface SpotListPanelProps {
  isDesktop: boolean
  isCollapsed: boolean
  onCollapsedChange: Dispatch<SetStateAction<boolean>>
  // 모바일 전용 3단계 스와이프 — 데스크탑의 isCollapsed(접기/펴기 버튼)와는
  // 완전히 별개 상태. minimized: 검색창만, default: 지금까지의 기본 모습,
  // full: 목록이 화면을 거의 다 차지.
  mobilePanelState: MobilePanelState
  onMobilePanelStateChange: Dispatch<SetStateAction<MobilePanelState>>
  filterMode: 'category' | 'star'
  onFilterModeChange: Dispatch<SetStateAction<'category' | 'star'>>
  categories: PlaceCategory
  onCategoriesChange: Dispatch<SetStateAction<PlaceCategory>>
  starFilter: string[]
  onStarFilterChange: Dispatch<SetStateAction<string[]>>
  search: string
  // 2026-09 QA 8번 — 지역검색 성공 후에도 검색어를 지우지 않고 남겨두는
  // 로직(MapPage.handleSearchChange)이 일반 setter가 아니라 별도 처리가
  // 필요해서, Dispatch<SetStateAction<string>>이 아닌 평범한 콜백으로 좁힘
  // (실제로도 이 파일에선 항상 문자열만 넘기지 updater 함수를 쓴 적 없음).
  onSearchChange: (value: string) => void
  // 팀 태스크보드 6번(동네검색) — 검색창은 이미 불러온 스팟을 텍스트로 거르는
  // 용도 그대로 두고, 이 콜백은 검색어를 카카오 지역 검색으로 넘겨 "강남"처럼
  // 목록에 없는 지역으로도 이동하게 한다. 모바일은 키보드에 Enter가 없는
  // 경우가 많아 명시적 버튼이 필요 — 하트 토글 옆에 배치.
  onSubmitAreaSearch: () => void
  isSearchingArea: boolean
  canSearchArea: boolean
  showSavedList: boolean
  onShowSavedListChange: Dispatch<SetStateAction<boolean>>
  // 2026-09 QA 6번 — 지도 진입 시 항상(스크롤해야만 보일 만큼 아래에) 떠 있던
  // "이 지역 연관 관광지 추천"을 토글로 켜고 끌 수 있게 변경. 켜면 찜 목록
  // 다음, 주변 스팟 목록보다 위(우선순위: 찜 > 관광지 추천 > 주변 스팟)에 노출.
  showAttractions: boolean
  onShowAttractionsChange: Dispatch<SetStateAction<boolean>>
  onSelectAttraction: (name: string) => void
  savedPlaces: Place[]
  places: Place[]
  isLoading: boolean
  onSelectPlace: (place: Place) => void
  center: { lat: number; lng: number }
}

export function SpotListPanel({
  isDesktop,
  isCollapsed,
  onCollapsedChange,
  mobilePanelState,
  onMobilePanelStateChange,
  filterMode,
  onFilterModeChange,
  categories,
  onCategoriesChange,
  starFilter,
  onStarFilterChange,
  search,
  onSearchChange,
  onSubmitAreaSearch,
  isSearchingArea,
  canSearchArea,
  showSavedList,
  onShowSavedListChange,
  showAttractions,
  onShowAttractionsChange,
  onSelectAttraction,
  savedPlaces,
  places,
  isLoading,
  onSelectPlace,
  center,
}: SpotListPanelProps) {
  const { t } = useTranslation()
  const touchStartY = useRef<number | null>(null)

  function resetFilters() {
    onSearchChange('')
    onCategoriesChange('all')
    onStarFilterChange([])
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    touchStartY.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (touchStartY.current === null) return
    const delta = e.clientY - touchStartY.current
    // 아래로 스와이프 = 최소화 방향(-1), 위로 스와이프 = 전체화면 방향(+1).
    // 이미 끝(minimized/full)에 있으면 그 자리에 그대로 머문다(clamp).
    if (delta > SWIPE_THRESHOLD) onMobilePanelStateChange((prev) => stepMobilePanelState(prev, -1))
    else if (delta < -SWIPE_THRESHOLD) onMobilePanelStateChange((prev) => stepMobilePanelState(prev, 1))
    touchStartY.current = null
  }

  function renderPlaceRow(place: Place) {
    return (
      <button
        key={place.id}
        type="button"
        onClick={() => onSelectPlace(place)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{place.name}</p>
            <RatingBadge placeId={place.id} />
          </div>
          <p className="truncate text-xs text-muted-foreground">{place.address}</p>
          {/* 팀 태스크보드 12번 — 스타별 탭에서는 기존 카테고리 태그(음식/숙소 등)
              대신 소속 persona.label을 뱃지로 보여준다(어느 스타 루트의 장소인지
              한눈에 구분). 카테고리 탭에서는 기존 그대로 카테고리 라벨 표시. */}
          {filterMode === 'star' && (place.tags?.length ?? 0) > 0 ? (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {place.tags!.map((tag) => (
                <span key={tag} className="inline-block rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t(getCategoryLabelKey(place.category))}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          {place.distanceM !== undefined && (
            <p className="text-xs font-semibold text-foreground">{formatDistance(place.distanceM)}</p>
          )}
          {place.crowdLevel && <CrowdBadge level={place.crowdLevel} className="mt-1" />}
        </div>
      </button>
    )
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
    return places.map(renderPlaceRow)
  }

  const savedToggleButton = (
    <Button
      size="icon"
      variant={showSavedList ? 'default' : 'outline'}
      onClick={() => onShowSavedListChange((v) => !v)}
      aria-pressed={showSavedList}
      aria-label={t('map.show_saved')}
      className="shrink-0"
    >
      <Heart className={cn('h-4 w-4', showSavedList && 'fill-current')} />
    </Button>
  )

  // 2026-09 QA 6번 — "이 지역 연관 관광지 추천"을 항상 스크롤해서 봐야 하던
  // 것을 토글로 전환.
  const attractionsToggleButton = (
    <Button
      size="icon"
      variant={showAttractions ? 'default' : 'outline'}
      onClick={() => onShowAttractionsChange((v) => !v)}
      aria-pressed={showAttractions}
      aria-label={t('map.show_attractions')}
      className="shrink-0"
    >
      <Sparkles className="h-4 w-4" />
    </Button>
  )

  // 팀 태스크보드 6번 — 모바일은 키보드에 Enter가 없는 경우가 많아 명시적 버튼이
  // 필요하다는 요청으로 하트 토글 바로 옆에 배치, 모바일/데스크탑 동일 노출.
  // 퍼센트 좌표 폴백(canSearchArea=false)에서는 카카오 지역검색 자체가 불가능해
  // 버튼을 숨긴다.
  const areaSearchButton = canSearchArea && (
    <Button
      size="icon"
      variant="outline"
      onClick={onSubmitAreaSearch}
      disabled={isSearchingArea || !search.trim()}
      aria-label={t('map.search_this_area')}
      className="shrink-0"
    >
      {isSearchingArea ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
    </Button>
  )

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') onSubmitAreaSearch()
  }

  // 모바일 최소화면(minimized)에서는 검색창 줄만 남기고 필터 탭은 숨겨야 해서
  // 두 조각으로 분리 — 데스크탑/기본·전체화면 모바일은 여전히 같이 렌더링.
  const searchRow = (
    <div className="flex items-center gap-2 px-4 pb-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={t('map.search_placeholder')}
          // 2026-09 QA 9번 — 모바일 검색 시 화면 비율이 안 유지되던 원인:
          // iOS Safari는 포커스한 input의 글자 크기가 16px보다 작으면 화면을
          // 자동으로 확대(줌인)해버려서, 그 상태로 지도/하단 메뉴 일부가
          // 화면 밖으로 밀려나 보였다. 모바일에서만 16px(text-base) 이상으로,
          // 데스크탑은 기존 14px(text-sm) 그대로 유지.
          className="w-full rounded-xl border border-border bg-muted py-2 pl-8 pr-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50 md:text-sm"
        />
      </div>
      {areaSearchButton}
      {savedToggleButton}
      {attractionsToggleButton}
    </div>
  )

  const filterTabs = (
    <div className="px-4 pb-2">
      <Tabs value={filterMode} onValueChange={(v) => onFilterModeChange(v as 'category' | 'star')}>
        <TabsList className="w-full">
          <TabsTrigger value="category" className="flex-1">
            {t('map.filter_mode_category')}
          </TabsTrigger>
          <TabsTrigger value="star" className="flex-1">
            {t('map.filter_mode_star')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="category" className="pt-2">
          <CategoryFilter selected={categories} onChange={onCategoriesChange} />
        </TabsContent>
        <TabsContent value="star" className="pt-2">
          <StarFilter selected={starFilter} onChange={onStarFilterChange} />
        </TabsContent>
      </Tabs>
    </div>
  )

  const searchAndFilter = (
    <div className="space-y-2 pb-2">
      {searchRow}
      {filterTabs}
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

  // 찜 목록은 자체적으로 높이를 제한(overflow-y-auto)해서, 아무리 많이
  // 찜해뒀어도 아래 "주변 스팟"/연관 관광지 추천이 화면 밖으로 밀려나지 않게 함.
  const savedListSection = showSavedList && (
    <div className="border-b border-border pb-2">
      <div className="flex items-center justify-between px-4 pb-2 pt-1">
        <p className="text-sm font-bold text-foreground">{t('map.saved_list_title')}</p>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          {savedPlaces.length}
        </span>
      </div>
      {savedPlaces.length === 0 ? (
        <p className="px-4 pb-2 text-xs text-muted-foreground">{t('map.saved_list_empty')}</p>
      ) : (
        <div className="max-h-64 overflow-y-auto">{savedPlaces.map(renderPlaceRow)}</div>
      )}
    </div>
  )

  // 우선순위: 찜 > 관광지 추천 > 주변 스팟 — savedListSection과 동일하게
  // 자체 높이 제한(overflow-y-auto)을 둬서, 추천 개수가 많아도 아래 "주변
  // 스팟" 목록이 화면 밖으로 밀려나지 않게 한다.
  const attractionsSection = showAttractions && (
    <div className="max-h-72 overflow-y-auto border-b border-border">
      <RelatedAttractionsList lat={center.lat} lng={center.lng} onSelect={onSelectAttraction} />
    </div>
  )

  const listRegion = <div className="min-h-0 flex-1 overflow-y-auto pb-4">{renderList()}</div>

  // 모바일 3단계(minimized/default/full)와 데스크탑 접기/펴기(isCollapsed)는
  // 서로 별개 상태라 분리해서 계산 — 데스크탑 쪽은 기존 로직 그대로.
  const mobileFlexClass =
    mobilePanelState === "minimized" ? "flex-none" : mobilePanelState === "full" ? "min-h-0 flex-1" : "min-h-0 flex-3"

  return (
    <div
      className={cn(
        "flex flex-col border-t border-border md:border-l md:border-t-0",
        isDesktop ? (isCollapsed ? "flex-none" : "min-h-0 flex-3 md:flex-1") : mobileFlexClass,
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
          {attractionsToggleButton}
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
            {searchRow}
            {/* 최소화면(minimized)에서는 검색창 줄만 남기고 필터/찜목록/타이틀
                전부 숨김(대화로 확정) — 기존 "접힘"은 필터까지 같이 보였음. */}
            {mobilePanelState !== "minimized" && (
              <>
                {filterTabs}
                {savedListSection}
                {attractionsSection}
                {titleRow}
              </>
            )}
          </div>
          {mobilePanelState !== "minimized" && listRegion}
        </>
      ) : (
        <>
          {searchAndFilter}
          {savedListSection}
          {attractionsSection}
          {titleRow}
          {listRegion}
        </>
      )}
    </div>
  );
}
