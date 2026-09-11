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
import { usePageHelpStore } from '@/store/page-help-store'
import { useCurrentLocation } from '@/lib/use-current-location'
import { useMediaQuery } from '@/lib/use-media-query'
import { type Place, type PlaceCategory } from '@/types/place'
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

export default function MapPage() {
  const { t, i18n } = useTranslation()
  const setHelp = usePageHelpStore((s) => s.setHelp)
  const clearHelp = usePageHelpStore((s) => s.clearHelp)
  const { coords, locationLabel, requestLocation } = useCurrentLocation()
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

  const candidates = useMemo(() => {
    if (!focusPlaces.length) return places
    const focusIds = new Set(focusPlaces.map((p) => p.id))
    return [...focusPlaces, ...places.filter((p) => !focusIds.has(p.id))]
  }, [places, focusPlaces])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return candidates.filter((place) => {
      const matchCategory =
        filterMode !== 'category' || categories.includes('all') || categories.includes(place.category)
      const matchStar = filterMode !== 'star' || !starFilter || place.tags?.includes(starFilter)
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
      <div className={cn('min-h-0 md:h-full md:flex-none', !isDesktop && isPanelCollapsed ? 'flex-1' : 'flex-4')}>
        <MapCanvas
          center={effectiveCoords}
          places={filtered}
          fitPlaces={focusPlaces}
          selectedPlaceId={selectedPlace?.id}
          onSelectPlace={setSelectedPlace}
          onRequestLocation={handleRequestLocation}
          locationLabel={effectiveLocationLabel}
          onSearchArea={setSearchCenter}
        />
      </div>

      <SpotListPanel
        isDesktop={isDesktop}
        isCollapsed={isPanelCollapsed}
        onCollapsedChange={setIsPanelCollapsed}
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
