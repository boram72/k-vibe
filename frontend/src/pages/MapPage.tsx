import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MapCanvas } from '@/blocks/map/map-canvas'
import { SpotListPanel } from '@/blocks/map/spot-list-panel'
import { PlaceDetailSheet } from '@/blocks/map/place-detail-sheet'
import { fetchMapPlaces, DEFAULT_MAP_SEARCH_RADIUS } from '@/api/places'
import { fetchSavedPlaces, toggleSavedPlace } from '@/lib/saved-places'
import { searchKakaoArea } from '@/lib/kakao-area-search'
import { fetchPersonaPlaces } from '@/api/personas'
import { usePageHelpStore } from '@/store/page-help-store'
import { useCurrentLocation } from '@/lib/use-current-location'
import { useMediaQuery } from '@/lib/use-media-query'
import { type Place, type PlaceCategory } from '@/types/place'
import type { Locale } from '@/i18n'
import { cn } from '@/lib/utils'

// Other features (e.g. Analyze) can hand off a one-time map focus via
// `navigate('../map', { state: { focusPlaces, openDetail } })`. This state lives
// only on that single navigation entry — refreshing or arriving via a normal
// nav tab click means no state, so MapPage falls back to the user's location.
// `openDetail` only auto-opens the detail sheet when there's exactly one focus place.
export interface MapFocusState {
  focusPlaces?: Place[]
  openDetail?: boolean
  initialSearch?: string
}

function hasValidCoordinates(place: Place): boolean {
  return Number.isFinite(place.lat) && Number.isFinite(place.lng)
}

// mobilePanelState가 커질수록(minimized -> default -> full) 지도가 차지하는
// 비율은 반대로 줄어든다 — full일 땐 지도를 작은 조각(h-16)만 남기고 목록에
// 화면을 거의 다 내준다. md: 쪽에서 항상 md:flex-none/md:h-full로 덮어써서
// 데스크탑엔 영향 없음(기존 flex-4 하드코딩과 동일한 안전장치).
function mobileMapFlexClass(state: 'minimized' | 'default' | 'full') {
  if (state === 'minimized') return 'flex-1'
  if (state === 'full') return 'flex-none h-16'
  return 'flex-4'
}

export default function MapPage() {
  const { t, i18n } = useTranslation()
  const setHelp = usePageHelpStore((s) => s.setHelp)
  const clearHelp = usePageHelpStore((s) => s.clearHelp)
  const { coords, locationLabel, requestLocation, isPrecise } = useCurrentLocation()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const routerLocation = useLocation()
  const focusState = routerLocation.state as MapFocusState | null
  const focusPlaces = useMemo(() => focusState?.focusPlaces?.filter(hasValidCoordinates) ?? [], [focusState])

  const [categories, setCategories] = useState<PlaceCategory[]>(['all'])
  // 2026-09 태스크보드 9번: 카테고리별/스타별 탭. 스타별일 때만 starFilter가
  // 실제로 필터링에 관여하고, 탭 전환 시 서로의 선택값은 안 지움(다시
  // 돌아왔을 때 그대로 유지되는 게 자연스럽다고 판단).
  const [filterMode, setFilterMode] = useState<'category' | 'star'>('category')
  const [starFilter, setStarFilter] = useState<string | null>(null)
  // Lazy initializer for the same reason as `selectedPlace` below — the
  // trending-keyword handoff (LandingPage → `navigate('../map', { state })`)
  // is router state available synchronously at first render.
  const [search, setSearch] = useState(() => focusState?.initialSearch ?? '')
  // Lazy initializer instead of an effect+setState — focusState is already
  // available synchronously at first render (it's router state, not async),
  // so there's no need to "react" to it after the fact.
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(() =>
    focusPlaces.length === 1 && focusState?.openDetail ? focusPlaces[0] : null,
  )
  // 2026-09: 하트 버튼이 "찜한 것만 필터"에서 "찜 목록 섹션 토글"로 역할이
  // 바뀜 — 더 이상 places를 필터링하지 않고, SpotListPanel이 이 값으로 위쪽에
  // 찜 목록 섹션을 보여줄지만 결정한다.
  const [showSavedList, setShowSavedList] = useState(false)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  // 팀 태스크보드 — 모바일 전용 3단계 스와이프(데스크탑의 isPanelCollapsed
  // 접기/펴기와는 별개 상태). 기본(default, 지금까지의 "펼침"과 동일) 상태에서
  // 위로 스와이프하면 전체화면(full, 목록이 화면을 거의 다 차지)으로, 아래로
  // 스와이프하면 최소화면(minimized, 검색창만 남고 필터/타이틀/목록 전부 숨김
  // — 기존 "접힘"은 필터까지 같이 보여서 더 축소하기로 함)으로 이동.
  const [mobilePanelState, setMobilePanelState] = useState<'minimized' | 'default' | 'full'>('default')
  // 팀 태스크보드 5번 — 지도를 드래그해서 옮긴 뒤 "이 지역에서 검색"을 누르면
  // 이 값이 채워지고, 그 좌표를 기준으로 /places를 다시 조회한다("현재 위치"를
  // 누르면 null로 되돌아가 GPS 좌표로 복귀). focusPlaces(다른 페이지에서 넘어온
  // 핸드오프)가 있을 땐 그게 항상 우선이라 searchCenter는 무시된다.
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null)

  // Focus-place handoffs (Analyze/Persona/Radar → "view on map") re-center the
  // search around that place instead of the user's literal current location.
  const effectiveCoords = focusPlaces[0]
    ? { lat: focusPlaces[0].lat, lng: focusPlaces[0].lng }
    : (searchCenter ?? coords)

  function handleRequestLocation() {
    setSearchCenter(null)
    requestLocation()
  }

  // 팀 태스크보드 6번 — "동네검색". 기존 검색창(search)은 그대로 두고(이미 불러온
  // 스팟을 텍스트로 필터링하는 용도), 이 버튼/Enter는 검색어를 카카오 장소검색으로
  // 지역 좌표를 얻어 searchCenter로 승격한다(5번과 같은 메커니즘 재사용). 성공하면
  // 이제 새 지역의 스팟 목록이 내려오므로 이전 검색어는 지운다 — 안 지우면 옛 텍스트로
  // 새 목록이 다시 필터링돼 방금 이동한 지역이 빈 목록처럼 보일 수 있음.
  const areaSearchMutation = useMutation({
    mutationFn: searchKakaoArea,
    onSuccess: (coords) => {
      if (!coords) {
        toast.error(t('map.search_area_not_found'))
        return
      }
      setSearchCenter(coords)
      setSearch('')
    },
  })

  function handleSearchArea() {
    if (!search.trim() || areaSearchMutation.isPending) return
    areaSearchMutation.mutate(search)
  }

  // 실제 카카오 지도(services 라이브러리)가 있을 때만 의미 있는 기능 — 퍼센트
  // 좌표 폴백 모드에서는 kakao.maps.services 자체가 없어 항상 null만 돌아온다.
  const canSearchArea = Boolean(import.meta.env.VITE_KAKAO_MAP_KEY)

  const { data: places = [], isLoading } = useQuery({
    queryKey: ['map-places', effectiveCoords.lat, effectiveCoords.lng, i18n.language],
    queryFn: () =>
      fetchMapPlaces({
        lat: effectiveCoords.lat,
        lng: effectiveCoords.lng,
        radius: DEFAULT_MAP_SEARCH_RADIUS,
        locale: i18n.language,
      }),
  })

  // 팀 태스크보드 12번 — 스타별 필터에서 쓰는, 페르소나 태그가 붙은 실제 장소
  // 목록. /places(TourAPI 반경검색)와 달리 위치/반경과 무관하게 페르소나 루트
  // 전체를 내려주므로(FRONTEND_TODO_map_pan_search.md), 자주 안 바뀐다고 보고
  // staleTime을 길게 잡는다.
  const { data: personaPlaces = [] } = useQuery({
    queryKey: ['persona-places', i18n.language],
    queryFn: () => fetchPersonaPlaces(i18n.language as Locale),
    staleTime: 30 * 60 * 1000,
  })

  const queryClient = useQueryClient()
  const { data: savedPlaces = [] } = useQuery({
    queryKey: ['saved-places'],
    queryFn: fetchSavedPlaces,
  })
  const savedIds = useMemo(() => new Set(savedPlaces.map((p) => p.id)), [savedPlaces])
  const toggleSaveMutation = useMutation({
    mutationFn: toggleSavedPlace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-places'] }),
  })

  useEffect(() => {
    setHelp(t('map.help_title'), t('map.help_body'))
    return () => clearHelp()
  }, [setHelp, clearHelp, t])

  // Guards against StrictMode's dev-only double-invoke of mount effects —
  // without this, requestLocation() fires twice on a denied/unavailable
  // geolocation request, producing two identical toasts. The ref persists
  // across that synthetic remount, so the second invocation is a no-op.
  const didRequestLocationRef = useRef(false)
  useEffect(() => {
    if (!focusPlaces.length && !didRequestLocationRef.current) {
      didRequestLocationRef.current = true
      requestLocation()
    }
    // run once on mount only — focusState is a one-time handoff, not a live dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const effectiveLocationLabel = focusPlaces.length ? t('map.analysis_result') : locationLabel

  // 스타별 탭일 때만 personaPlaces를 섞는다 — 위치/반경과 무관한 전국구 목록이라
  // 카테고리 탭의 "전체"(현재 위치 주변 전부)에 섞이면 먼 지역 핀까지 끼어들어
  // 그 의미가 깨진다(대화로 확정, plan.md 12번 참고).
  const candidates = useMemo(() => {
    const base = focusPlaces.length
      ? [...focusPlaces, ...places.filter((p) => !focusPlaces.some((f) => f.id === p.id))]
      : places
    if (filterMode !== 'star') return base
    const baseIds = new Set(base.map((p) => p.id))
    return [...base, ...personaPlaces.filter((p) => !baseIds.has(p.id))]
  }, [places, focusPlaces, filterMode, personaPlaces])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return candidates.filter((place) => {
      const matchCategory =
        filterMode !== 'category' || categories.includes('all') || categories.includes(place.category)
      // 스타별 "전체"(starFilter 없음)는 페르소나 태그가 붙은 장소 전체를 보여주고,
      // 특정 스타를 고르면 그 태그와 일치하는 장소만 남긴다.
      const matchStar =
        filterMode !== 'star' || (starFilter ? place.tags?.includes(starFilter) : (place.tags?.length ?? 0) > 0)
      const matchSearch =
        !q ||
        place.name.toLowerCase().includes(q) ||
        place.address.toLowerCase().includes(q) ||
        place.tags?.some((tag) => tag.toLowerCase().includes(q))
      return matchCategory && matchStar && matchSearch
    })
  }, [candidates, categories, filterMode, starFilter, search])

  function toggleSave(id: string) {
    const place = candidates.find((p) => p.id === id)
    if (place) toggleSaveMutation.mutate(place)
  }

  return (
    <div
      className={cn(
        'flex h-[calc(100dvh-3.5rem-4rem)] flex-col overflow-hidden md:h-[calc(100dvh-3.5rem)] md:grid',
        isDesktop && isPanelCollapsed ? 'md:grid-cols-[1fr_64px]' : 'md:grid-cols-[1fr_380px]',
      )}
    >
      <div className={cn('min-h-0 md:h-full md:flex-none', !isDesktop ? mobileMapFlexClass(mobilePanelState) : 'flex-4')}>
        <MapCanvas
          center={effectiveCoords}
          places={filtered}
          fitPlaces={focusPlaces}
          selectedPlaceId={selectedPlace?.id}
          onSelectPlace={setSelectedPlace}
          onRequestLocation={handleRequestLocation}
          locationLabel={effectiveLocationLabel}
          onSearchArea={setSearchCenter}
          myLocation={isPrecise ? coords : null}
          compact={!isDesktop && mobilePanelState === 'full'}
        />
      </div>

      <SpotListPanel
        isDesktop={isDesktop}
        isCollapsed={isPanelCollapsed}
        onCollapsedChange={setIsPanelCollapsed}
        mobilePanelState={mobilePanelState}
        onMobilePanelStateChange={setMobilePanelState}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
        categories={categories}
        onCategoriesChange={setCategories}
        starFilter={starFilter}
        onStarFilterChange={setStarFilter}
        search={search}
        onSearchChange={setSearch}
        onSubmitAreaSearch={handleSearchArea}
        isSearchingArea={areaSearchMutation.isPending}
        canSearchArea={canSearchArea}
        showSavedList={showSavedList}
        onShowSavedListChange={setShowSavedList}
        savedPlaces={savedPlaces}
        places={filtered}
        isLoading={isLoading}
        onSelectPlace={setSelectedPlace}
        center={effectiveCoords}
      />

      <PlaceDetailSheet
        place={selectedPlace}
        saved={selectedPlace ? savedIds.has(selectedPlace.id) : false}
        onClose={() => setSelectedPlace(null)}
        onToggleSave={toggleSave}
      />
    </div>
  )
}
