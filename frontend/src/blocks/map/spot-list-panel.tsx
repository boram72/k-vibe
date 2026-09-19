import { useRef, type Dispatch, type KeyboardEvent, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Heart, Loader2, PanelRightClose, PanelRightOpen, Search, Sparkles, X } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CategoryFilter } from '@/blocks/map/category-filter'
import { StarFilter } from '@/blocks/map/star-filter'
import { RelatedAttractionsList } from '@/blocks/map/related-attractions-list'
import { LoadingSkeleton } from '@/blocks/common/loading-skeleton'
import { CrowdBadge } from '@/blocks/common/crowd-badge'
import { RatingBadge } from '@/blocks/common/rating-badge'
import { Button } from '@/components/ui/button'
import { getCategoryLabelKey, type Place, type PlaceCategory } from '@/types/place'
import type { ActiveSection } from '@/pages/MapPage'
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
  // 5-2(plan.md) — 검색결과/찜/연관관광지/SNS분석기/주변 스팟 중 지금 화면에
  // 보여줄 딱 하나를 고르는 데 직접 쓰인다(아래 activeTitle/activeList 참고).
  activeSection: ActiveSection
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
  // 5-2(plan.md, 대화로 설계 확정) — 찜/연관관광지/검색결과/SNS분석기는 이제
  // MapPage의 activeSection 단일 상태로 상호배타 관리됨(항상 최대 하나만
  // 켜짐) — 이 컴포넌트는 그 사실을 몰라도 되게, 이미 걸러진 boolean/값만
  // 받는다. 토글 콜백도 "다음 값"을 계산해서 넘기지 않고(예전 Dispatch<
  // SetStateAction<boolean>>는 독립 boolean 시절 방식) 그냥 "토글해줘"라는
  // 의도만 전달하는 평범한 콜백으로 단순화 — 실제 다음 상태 계산(다른 섹션과의
  // 배타 처리 포함)은 MapPage가 전담.
  showSavedList: boolean
  onToggleSavedList: () => void
  // 2026-09 QA 6번 — 지도 진입 시 항상(스크롤해야만 보일 만큼 아래에) 떠 있던
  // "이 지역 연관 관광지 추천"을 토글로 켜고 끌 수 있게 변경.
  showAttractions: boolean
  onToggleAttractions: () => void
  onSelectAttraction: (name: string) => void
  // 2026-09 대화 중 요청 — 검색창에 행정구역이 아닌 랜드마크/상호명을 입력하면
  // 자동 이동 대신 정확도순/거리순 후보 목록을 보여준다. null이면(검색 안 함/
  // 행정구역 매칭, 또는 activeSection이 'searchResults'가 아님) 이 섹션 자체를 숨김.
  areaSearchLists: { relevance: Place[]; distance: Place[] } | null
  // 5-4(plan.md) — 검색결과 목록은 한번 뜨면 닫을 방법이 없었음(사용자 요청) —
  // 이 콜백은 MapPage의 activeSection을 null로 되돌려 결과 섹션을 숨긴다.
  // 검색창 텍스트 자체는 그대로 둔다("뭘 검색했는지 보이게" 하는 기존 의도와는
  // 무관한, 별개의 동작).
  onCloseAreaSearchResults: () => void
  // 5-1(plan.md, 대화 중 요청) — SNS 분석기에서 넘어온 결과(focusPlaces)는
  // "주변 스팟"과 섞이면 안 됨(둘은 성격이 다른 목록) — 검색결과/찜 목록과
  // 동일하게 자기만의 독립된 섹션으로 분리해서 보여준다. 빈 배열이면 섹션
  // 자체를 숨김(핸드오프 없이 들어온 경우, 또는 activeSection이 'analyzer'가 아님).
  analyzerPlaces: Place[]
  // 5-2(plan.md) — SNS 분석기 섹션도 검색결과와 동일하게 닫기 버튼 제공.
  // 닫아도 focusPlaces 데이터 자체는 안 사라짐(activeSection만 바뀜) — 닫으면
  // 그 항목들이 "주변 스팟" 목록으로 다시 합쳐져 보인다(MapPage가 처리).
  onCloseAnalyzerSection: () => void
  savedPlaces: Place[]
  // "주변 스팟"(또는 페르소나별 탭이면 "페르소나 방문 장소") 목록 — analyzerPlaces
  // 는 이미 별도 섹션으로 빠졌으므로 여기엔 안 섞여 들어온다(MapPage가 미리
  // 제외하고 내려줌).
  places: Place[]
  isLoading: boolean
  onSelectPlace: (place: Place) => void
  // 5-2(plan.md, 대화로 확정) — "내 루트"의 스팟 카드에서 지도 아이콘을 눌러
  // 들어온 경우(항상 단일 장소)는 SNS 분석기와 달리 자기만의 섹션을 안 만들고
  // 이 "주변 스팟" 목록에 그대로 포함시키되, 그 장소 행에만 태그를 붙여
  // 구분한다. null이면 그런 핸드오프가 아니라는 뜻이라 아무 행도 태그 안 붙임.
  routeOriginPlaceId: string | null
  // 5-3(plan.md) — 페르소나별 탭일 때는 이 목록이 "주변"이 아니라 "페르소나
  // 방문지"라 다른 문구를 써야 함 — 어떤 문구를 쓸지는 MapPage가 결정해서
  // 그대로 내려준다.
  listTitle: string
  // RelatedAttractionsList가 백엔드(/attractions/related)로 그대로 보내는
  // 값 — 지도가 실제로 보여주는 뷰 중심(effectiveCoords)이 아니라 MapPage의
  // queryCoords를 받는다(GPS 버튼만으로는 안 바뀌는, 명시적 검색 좌표).
  center: { lat: number; lng: number }
}

export function SpotListPanel({
  activeSection,
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
  onToggleSavedList,
  showAttractions,
  onToggleAttractions,
  onSelectAttraction,
  areaSearchLists,
  onCloseAreaSearchResults,
  analyzerPlaces,
  onCloseAnalyzerSection,
  savedPlaces,
  places,
  isLoading,
  onSelectPlace,
  center,
  routeOriginPlaceId,
  listTitle,
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
            {/* 5-2(plan.md, 대화로 확정) — "내 루트"에서 지도 아이콘을 눌러 온
                경우는 자기만의 섹션을 안 만들고 이 "주변 스팟" 목록에 그대로
                섞이므로, 해당 행에만 태그를 붙여 구분한다. */}
            {place.id === routeOriginPlaceId && (
              <span className="inline-block shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {t('map.from_my_route_tag')}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {place.address === '-' ? t('placeDetail.info_unavailable') : place.address}
          </p>
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
      data-tour="map-saved"
      size="icon"
      variant={showSavedList ? 'default' : 'outline'}
      onClick={onToggleSavedList}
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
      data-tour="map-attractions"
      size="icon"
      variant={showAttractions ? 'default' : 'outline'}
      onClick={onToggleAttractions}
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
      {/* 튜토리얼(map-search)이 검색창과 돋보기 버튼을 한 덩어리로 하이라이트
          하도록 감쌌다 — 하트/별 버튼은 각자 자기 단계(map-saved,
          map-attractions)에서 따로 하이라이트. 레이아웃은 그대로(flex-1이
          이 래퍼로 옮겨왔을 뿐). */}
      <div data-tour="map-search" className="flex flex-1 items-center gap-2">
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
      </div>
      {savedToggleButton}
      {attractionsToggleButton}
    </div>
  )

  const filterTabs = (
    <div data-tour="map-filter" className="px-4 pb-2">
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
      <p className="text-sm font-bold text-foreground">{listTitle}</p>
      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
        {places.length}
      </span>
    </div>
  )

  // 5-2(plan.md, 대화로 설계 확정) — 검색결과/찜/연관관광지/SNS분석기/주변
  // 스팟이 전부 독립적으로 stack되면(예전 방식) "하나의 이벤트엔 하나의
  // 목록만" 원칙과 안 맞고, 무엇보다 여러 개가 겹쳐 쌓이면 뒤쪽 섹션이 화면
  // 밖으로 밀려 아예 안 보이는 문제가 있었음(대화 중 실측 확인). 그래서 각
  // 섹션을 "고정되는 타이틀(닫기/카운트 포함)"과 "그 아래 남는 공간을 전부
  // 채우는 스크롤 목록" 한 쌍으로 만들어두고, 화면엔 activeSection에 해당하는
  // 딱 한 쌍만 렌더링한다(아래 activeTitle/activeList 계산 참고) — 다른
  // 섹션은 아예 DOM에 안 그려짐, "주변 스팟"도 예외 없이 마찬가지.

  // 2026-09 대화 중 요청 — 검색창 직접 입력(랜드마크/상호명) 결과 목록.
  // 정확도순 목록이 위, 거리순 목록(정확도순과 겹치는 장소는 이미 제거된
  // 상태로 넘어옴)이 아래. 클릭하면 다른 스팟 클릭과 동일하게 onSelectPlace
  // 하나만 호출 — 검색 직후엔 아무것도 강조되지 않다가, 이 목록에서 실제로
  // 고른 장소에만 빨간 핀이 붙는다(기존 "여러 결과 전부 빨간 핀" 방식과 달리
  // 이 흐름은 목록에서 하나를 고르는 게 핵심이라 의도적으로 다르게 처리).
  const hasAreaSearchResults = Boolean(areaSearchLists && (areaSearchLists.relevance.length > 0 || areaSearchLists.distance.length > 0))
  const areaSearchResultsTitle = (
    <div className="flex items-center justify-between px-4 pb-2 pt-1">
      <p className="text-sm font-bold text-foreground">{t('map.area_search_results_title')}</p>
      <button
        type="button"
        onClick={onCloseAreaSearchResults}
        aria-label={t('map.close_search_results')}
        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
  const areaSearchResultsList = (
    <div className="min-h-0 flex-1 overflow-y-auto pb-4">
      {areaSearchLists && areaSearchLists.relevance.length > 0 && (
        <div>
          <p className="px-4 pb-1 text-[11px] font-semibold text-muted-foreground">{t('map.area_search_relevance')}</p>
          {areaSearchLists.relevance.map(renderPlaceRow)}
        </div>
      )}
      {areaSearchLists && areaSearchLists.distance.length > 0 && (
        <div>
          <p className="px-4 pb-1 pt-1 text-[11px] font-semibold text-muted-foreground">{t('map.area_search_distance')}</p>
          {areaSearchLists.distance.map(renderPlaceRow)}
        </div>
      )}
    </div>
  )

  // 5-1(plan.md, 대화 중 요청) — SNS 분석기에서 넘어온 결과 전용 섹션.
  // 5-2(plan.md) — 검색결과와 동일하게 닫기 버튼 제공. 닫아도 focusPlaces
  // 데이터 자체는 안 사라짐(MapPage의 activeSection만 바뀜) — 닫으면 이
  // 항목들이 "주변 스팟" 목록으로 다시 합쳐져 보인다.
  const analyzerTitle = (
    <div className="flex items-center justify-between px-4 pb-2 pt-1">
      <p className="text-sm font-bold text-foreground">{t('map.sns_analyzer_title')}</p>
      <div className="flex items-center gap-1.5">
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          {analyzerPlaces.length}
        </span>
        <button
          type="button"
          onClick={onCloseAnalyzerSection}
          aria-label={t('map.close_analyzer_results')}
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
  const analyzerList = (
    <div className="min-h-0 flex-1 overflow-y-auto pb-4">{analyzerPlaces.map(renderPlaceRow)}</div>
  )

  const savedTitle = (
    <div className="flex items-center justify-between px-4 pb-2 pt-1">
      <p className="text-sm font-bold text-foreground">{t('map.saved_list_title')}</p>
      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
        {savedPlaces.length}
      </span>
    </div>
  )
  const savedList =
    savedPlaces.length === 0 ? (
      <p className="px-4 pb-2 text-xs text-muted-foreground">{t('map.saved_list_empty')}</p>
    ) : (
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">{savedPlaces.map(renderPlaceRow)}</div>
    )

  // RelatedAttractionsList가 타이틀을 자체적으로 렌더링하는 컴포넌트라(내부
  // 구조를 안 건드리고 그대로 재사용) 다른 섹션들처럼 타이틀을 밖으로 못
  // 뺌 — 이 섹션만 activeTitle 없이 activeList 하나로 처리(기존과 동일한
  // "타이틀도 같이 스크롤" 동작 유지, 이번 변경 범위 밖).
  const attractionsList = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <RelatedAttractionsList lat={center.lat} lng={center.lng} onSelect={onSelectAttraction} />
    </div>
  )

  const listRegion = (
    <div data-tour="map-list" className="min-h-0 flex-1 overflow-y-auto pb-4">
      {renderList()}
    </div>
  )

  // activeSection에 해당하는 타이틀/목록 한 쌍만 고른다 — 그 데이터가 실제로
  // 없으면(예: activeSection은 'searchResults'인데 areaSearchLists가 비었을
  // 때) 기본값(주변 스팟)으로 자연스럽게 폴백.
  let activeTitle: React.ReactNode = titleRow
  let activeList: React.ReactNode = listRegion
  if (activeSection === 'analyzer' && analyzerPlaces.length > 0) {
    activeTitle = analyzerTitle
    activeList = analyzerList
  } else if (activeSection === 'searchResults' && hasAreaSearchResults) {
    activeTitle = areaSearchResultsTitle
    activeList = areaSearchResultsList
  } else if (activeSection === 'saved') {
    activeTitle = savedTitle
    activeList = savedList
  } else if (activeSection === 'attractions') {
    activeTitle = null
    activeList = attractionsList
  }

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
            {/* 최소화면(minimized)에서는 검색창 줄만 남기고 필터/타이틀
                전부 숨김(대화로 확정) — 기존 "접힘"은 필터까지 같이 보였음. */}
            {mobilePanelState !== "minimized" && (
              <>
                {filterTabs}
                {activeTitle}
              </>
            )}
          </div>
          {mobilePanelState !== "minimized" && activeList}
        </>
      ) : (
        <>
          {searchAndFilter}
          {activeTitle}
          {activeList}
        </>
      )}
    </div>
  );
}
