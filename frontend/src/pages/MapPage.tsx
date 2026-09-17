import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
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
  // 내 루트의 개별 스팟에서 지도 아이콘을 눌러 들어온 경우에만 true — 그
  // 스팟의 상세카드에 "루트로 돌아가기" 버튼을 보여줄지 판단하는 데 쓴다.
  returnToRoute?: boolean
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
  const navigate = useNavigate()
  const focusState = routerLocation.state as MapFocusState | null
  const focusPlaces = useMemo(() => focusState?.focusPlaces?.filter(hasValidCoordinates) ?? [], [focusState])
  // 내 루트에서 넘어온 그 스팟(정확히 이 id)의 상세카드에서만 "루트로
  // 돌아가기"를 보여주기 위한 origin id — lazy init(다른 focusState 값들과
  // 동일 패턴), 이후 다른 스팟을 눌러도 이 값은 안 바뀜.
  const [routeOriginPlaceId] = useState<string | null>(() =>
    focusState?.returnToRoute && focusPlaces.length === 1 ? focusPlaces[0].id : null,
  )

  // 2026-09 QA 7번 — 다중선택에서 단일선택(라디오 버튼 방식)으로 변경.
  const [categories, setCategories] = useState<PlaceCategory>('all')
  // 2026-09 태스크보드 9번: 카테고리별/페르소나별 탭. 페르소나별일 때만
  // starFilter가 실제로 필터링에 관여하고, 탭 전환 시 서로의 선택값은 안 지움
  // (다시 돌아왔을 때 그대로 유지되는 게 자연스럽다고 판단). 다중선택(대화 중
  // 요청) — 빈 배열이 "전체"를 의미(CategoryFilter의 'all' 리터럴 대신 빈
  // 배열을 쓰는 이유는 star-filter.tsx 주석 참고).
  const [filterMode, setFilterMode] = useState<'category' | 'star'>('category')
  const [starFilter, setStarFilter] = useState<string[]>([])
  // Lazy initializer for the same reason as `selectedPlace` below — the
  // trending-keyword handoff (LandingPage → `navigate('../map', { state })`)
  // is router state available synchronously at first render.
  const [search, setSearch] = useState(() => focusState?.initialSearch ?? '')
  // 2026-09 QA 8번(추가 요청) — 검색창 텍스트가 그대로 남아있는 동안엔 방금
  // 지역검색으로 받아온 목록을 다시 텍스트로 거르지 않기 위한 값(위 설명 참고).
  const [areaSearchedQuery, setAreaSearchedQuery] = useState<string | null>(null)

  function handleSearchChange(value: string) {
    setSearch(value)
    setAreaSearchedQuery(null)
  }
  // Lazy initializer instead of an effect+setState — focusState is already
  // available synchronously at first render (it's router state, not async),
  // so there's no need to "react" to it after the fact.
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(() =>
    focusPlaces.length === 1 && focusState?.openDetail ? focusPlaces[0] : null,
  )
  // 버그 수정 — 지도 핀의 빨간 강조(선택 표시)가 상세시트의 열림/닫힘과 같은
  // state(selectedPlace)를 공유하고 있어서, 상세시트를 닫으면(`onClose`가
  // `setSelectedPlace(null)`) 핀 강조까지 같이 사라졌음. 검색 결과 핀이
  // "닫아도 그 자리에 머무는" 것과 마찬가지로, 핀 강조도 상세시트를 닫아도
  // 유지되고 "다른 장소를 새로 선택할 때만" 옮겨가야 해서 별도 state로 분리.
  const [highlightedPlaceId, setHighlightedPlaceId] = useState<string | null>(() => selectedPlace?.id ?? null)

  function handleSelectPlace(place: Place) {
    setSelectedPlace(place)
    setHighlightedPlaceId(place.id)
    // 버그 수정 — 지역검색/관광지추천으로 얻은 kakaoSearchResults는 highlightIds로
    // "선택 여부와 무관하게" 항상 빨간 핀 유지되는데(map-canvas.tsx 참고),
    // 그 결과 하나를 본 다음 완전히 무관한 다른 장소(예: 주변 스팟 목록)를
    // 선택해도 이 그룹은 안 지워져서 빨간 핀이 "옮겨가지 않고 그대로 남은 채
    // 새 선택 핀까지 추가로 빨개져 중복되어 보이는" 버그가 있었음(실사용 확인).
    // 지금 클릭한 장소가 그 검색결과 그룹 안에 없다면(=완전히 새로운 맥락으로
    // 이동) 옛 그룹을 비워서, 강조가 항상 "지금 선택된 곳" 하나만 따라가게 함
    // — 그 그룹 안의 장소를 다시 클릭한 경우(제자리 재선택)는 그대로 유지.
    if (kakaoSearchResults.length && !kakaoSearchResults.some((p) => p.id === place.id)) {
      setKakaoSearchResults([])
    }
  }
  // 2026-09: 하트 버튼이 "찜한 것만 필터"에서 "찜 목록 섹션 토글"로 역할이
  // 바뀜 — 더 이상 places를 필터링하지 않고, SpotListPanel이 이 값으로 위쪽에
  // 찜 목록 섹션을 보여줄지만 결정한다.
  const [showSavedList, setShowSavedList] = useState(false)
  // 2026-09 QA 6번 — "이 지역 연관 관광지 추천"을 항상 노출하던 것을 토글로
  // 전환(대화로 확정, 기본은 꺼짐).
  const [showAttractions, setShowAttractions] = useState(false)
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
  // 2026-09 QA 8번 — "이 지역에서 검색"으로 얻은 카카오 결과 원본. 지역명 검색은
  // 기존처럼 첫 결과 좌표로 searchCenter를 옮겨 /places(TourAPI)를 재조회하지만,
  // 상호명(예: "스타벅스 종로점")은 TourAPI에 그 가게 자체가 없어 재조회 결과에
  // 안 잡히므로, 카카오가 찾은 결과 자체를 그대로 후보에 더해 지도에 보여준다.
  // (지금은 attractionSearchMutation — 관광지 추천 클릭 — 전용. 검색창 직접
  // 입력은 아래 areaSearchLists로 분리됨.)
  const [kakaoSearchResults, setKakaoSearchResults] = useState<Place[]>([])
  // 2026-09 대화 중 요청 — 검색창에 "경복궁"/"인천공항"처럼 행정구역이 아닌
  // 랜드마크/상호명을 입력하면, 예전처럼 첫 결과로 자동 이동하지 않고 정확도순/
  // 거리순 두 후보 목록을 그대로 보여준다(목록에서 직접 고른 것만 이동+강조).
  const [areaSearchLists, setAreaSearchLists] = useState<{ relevance: Place[]; distance: Place[] } | null>(null)

  // Focus-place handoffs (Analyze/Persona/Radar → "view on map") re-center the
  // search around that place instead of the user's literal current location.
  const effectiveCoords = focusPlaces[0]
    ? { lat: focusPlaces[0].lat, lng: focusPlaces[0].lng }
    : (searchCenter ?? coords)

  function handleRequestLocation() {
    setSearchCenter(null)
    setKakaoSearchResults([])
    setAreaSearchLists(null)
    setHighlightedPlaceId(null)
    requestLocation()
  }

  // 팀 태스크보드 6번 — "동네검색". 기존 검색창(search)은 그대로 두고(이미 불러온
  // 스팟을 텍스트로 필터링하는 용도), 이 버튼/Enter는 검색어를 카카오 장소검색으로
  // 지역 좌표를 얻어 searchCenter로 승격한다(5번과 같은 메커니즘 재사용). 성공하면
  // 이제 새 지역의 스팟 목록이 내려오므로 이전 검색어는 지운다 — 안 지우면 옛 텍스트로
  // 새 목록이 다시 필터링돼 방금 이동한 지역이 빈 목록처럼 보일 수 있음.
  //
  // 2026-09 QA 8번 — 첫 결과 좌표로 searchCenter를 옮겨 /places를 재조회하는
  // 기존 동작은 그대로 두고, 카카오가 찾은 결과 전부(kakaoSearchResults)도
  // 같이 후보에 더한다 — 상호명 검색은 TourAPI 재조회만으로는 그 가게 자체가
  // 안 나오기 때문.
  // 버그 수정 — "스타벅스"처럼 지역명 없는 상호명 검색이 위치 힌트 없이는
  // 전국 아무 지점(예: 북한산 인근)으로 튈 수 있어(실사용 확인), 검색 시점의
  // 지도 중심(effectiveCoords)을 같이 넘겨 가까운 지점 우선으로 찾는다.
  const areaSearchMutation = useMutation({
    mutationFn: ({ query, near }: { query: string; near: { lat: number; lng: number } }) =>
      searchKakaoArea(query, near),
    onSuccess: (result, variables) => {
      if (!result) {
        toast.error(t('map.search_area_not_found'))
        return
      }
      if (result.type === 'address') {
        // 행정구역 매칭 — 예전처럼 그 위치로 바로 이동, 후보 목록은 없음.
        setSearchCenter(result.center)
        setKakaoSearchResults([])
        setAreaSearchLists(null)
      } else {
        // 랜드마크/상호명 매칭 — 자동 이동하지 않고 정확도순/거리순 목록만
        // 노출. 지도 이동·강조는 사용자가 목록에서 직접 골랐을 때만.
        setKakaoSearchResults([])
        setAreaSearchLists({ relevance: result.relevance, distance: result.distance })
      }
      // 검색어를 지우지 않고 남겨서 뭘 검색했는지 보이게 함(대화 중 요청) —
      // areaSearchedQuery를 같이 기록해서, 이 텍스트가 그대로인 동안은 방금
      // 받아온 결과를 다시 텍스트로 거르지 않게 한다(아래 filtered 참고).
      setAreaSearchedQuery(variables.query)
    },
  })

  function handleSearchArea() {
    if (!canSearchArea || !search.trim() || areaSearchMutation.isPending) return
    areaSearchMutation.mutate({ query: search, near: effectiveCoords })
  }

  // 6번 — "관광지 추천" 리스트 항목 클릭. TourAPI 연관관광지 응답엔 좌표가
  // 없어서(이름/지역명뿐) 이름으로 카카오 검색을 직접 날려 위치를 찾는다.
  // 검색창(search)은 건드리지 않음 — 사용자가 타이핑한 검색어가 아니라
  // 목록 클릭이라 검색창에 남길 이유가 없음(대화 중 요청).
  const attractionSearchMutation = useMutation({
    mutationFn: (name: string) => searchKakaoArea(name, effectiveCoords),
    onSuccess: (result) => {
      if (!result) {
        toast.error(t('map.search_area_not_found'))
        return
      }
      // 목록 클릭(사용자가 이미 특정 장소를 골랐음)이라 검색창 입력과 달리
      // 후보 목록을 또 보여줄 필요 없이 예전처럼 바로 이동 — 다만 예전
      // 코드가 그대로 쓰던 sort=distance 결과는 랜드마크명 검색에서 엉뚱한
      // 결과를 1등으로 올릴 수 있어(4번 진단) 정확도순(relevance) 결과를
      // 사용. 여러 매치가 나오면 기존처럼 전부 빨간 핀으로 강조 유지(이
      // 흐름의 다중 매치 강조 방식 자체는 이번 요청 범위 밖).
      if (result.type === 'address') {
        setSearchCenter(result.center)
        setKakaoSearchResults([])
      } else if (result.relevance.length > 0) {
        setSearchCenter({ lat: result.relevance[0].lat, lng: result.relevance[0].lng })
        setKakaoSearchResults(result.relevance)
      }
    },
  })

  function handleSelectAttraction(name: string) {
    if (!canSearchArea || attractionSearchMutation.isPending) return
    attractionSearchMutation.mutate(name)
  }

  // 실제 카카오 지도(services 라이브러리)가 있을 때만 의미 있는 기능 — 퍼센트
  // 좌표 폴백 모드에서는 kakao.maps.services 자체가 없어 항상 null만 돌아온다.
  const hasKakaoKey = Boolean(import.meta.env.VITE_KAKAO_MAP_KEY)
  // 2026-09 QA 5번 — 이전엔 hasKakaoKey만 보고 검색 UI를 켰는데, 이건 카카오
  // SDK 스크립트가 실제로 다 로드됐는지와는 무관해서, 페이지 진입 직후 SDK가
  // 아직 로딩 중인 순간에 검색하면 "결과 없음"으로만 보이고 잠시 후 재시도하면
  // 되던 문제(원인 진단 완료, plan.md 5번 참고). MapCanvas의 useKakaoLoader
  // 상태(onKakaoStatusChange)를 받아와 실제 준비 여부까지 함께 확인.
  const [kakaoStatus, setKakaoStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const canSearchArea = hasKakaoKey && kakaoStatus === 'ready'
  const isMapLoading = hasKakaoKey && kakaoStatus === 'loading'

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
  // 2026-09 대화 중 요청 — 검색창 직접 입력(랜드마크/상호명)으로 얻은 정확도순
  // +거리순 후보 목록. kakaoSearchResults(관광지 추천 클릭 전용, 항상 빨간
  // 강조)와 달리 이쪽은 목록에만 노출되고, 지도 핀/강조는 사용자가 목록에서
  // 직접 선택했을 때만 붙는다(아래 kakaoSearchResultIds에는 안 넣음).
  const areaSearchListPlaces = useMemo(
    () => (areaSearchLists ? [...areaSearchLists.relevance, ...areaSearchLists.distance] : []),
    [areaSearchLists],
  )

  const candidates = useMemo(() => {
    const base = focusPlaces.length
      ? [...focusPlaces, ...places.filter((p) => !focusPlaces.some((f) => f.id === p.id))]
      : places
    const baseIds = new Set(base.map((p) => p.id))
    const withKakaoResults = kakaoSearchResults.length
      ? [...base, ...kakaoSearchResults.filter((k) => !baseIds.has(k.id))]
      : base
    const withKakaoIds = new Set(withKakaoResults.map((p) => p.id))
    const withAreaSearchList = areaSearchListPlaces.length
      ? [...withKakaoResults, ...areaSearchListPlaces.filter((p) => !withKakaoIds.has(p.id))]
      : withKakaoResults
    if (filterMode !== 'star') return withAreaSearchList
    const withAreaSearchIds = new Set(withAreaSearchList.map((p) => p.id))
    return [...withAreaSearchList, ...personaPlaces.filter((p) => !withAreaSearchIds.has(p.id))]
  }, [places, focusPlaces, filterMode, personaPlaces, kakaoSearchResults, areaSearchListPlaces])

  // 2026-09 QA 8번 — 상호명 검색 결과 핀을 빨간색으로 강조하기 위한 id 집합.
  const kakaoSearchResultIds = useMemo(() => new Set(kakaoSearchResults.map((p) => p.id)), [kakaoSearchResults])
  // 검색 후보 목록도 카테고리 필터와 무관하게 항상 목록/핀에 남아있어야 하지만
  // (아래 filtered 참고), 강조 색(highlightIds)에는 안 들어가므로 별도 집합.
  const areaSearchListIds = useMemo(() => new Set(areaSearchListPlaces.map((p) => p.id)), [areaSearchListPlaces])

  // 페르소나별 탭에서 특정 페르소나(또는 "전체")를 고르면, 그 장소들이 지금
  // 화면(현재 위치 주변 반경) 밖에 있어도 안 보인다고 헷갈리지 않도록 지도가
  // 그 장소들을 다 담도록 자동으로 줌아웃/이동한다. `filtered`(검색어까지 반영된
  // 최종 목록) 대신 태그 일치 여부만으로 계산 — 검색창에 글자 하나 칠 때마다
  // 지도가 다시 튀는 걸 막고, 페르소나/스타 선택이 바뀔 때만 재조정되게 한다.
  // focusPlaces(다른 페이지에서 넘어온 1회성 핸드오프)가 있으면 그게 항상 우선.
  const personaFocusPlaces = useMemo(() => {
    if (filterMode !== 'star') return []
    return personaPlaces.filter((p) => starFilter.length === 0 || p.tags?.some((tag) => starFilter.includes(tag)))
  }, [filterMode, starFilter, personaPlaces])
  const fitPlaces = focusPlaces.length ? focusPlaces : personaFocusPlaces

  const filtered = useMemo(() => {
    // 지역검색 직후 검색창에 남겨둔 텍스트 그대로인 동안은 방금 받아온 결과를
    // 다시 텍스트로 거르지 않는다(위 areaSearchMutation.onSuccess 참고).
    const q = search === areaSearchedQuery ? '' : search.trim().toLowerCase()
    return candidates.filter((place) => {
      // 버그 수정 — 검색/관광지 추천 클릭으로 강조된 장소(kakaoSearchResultIds)가
      // 카테고리/페르소나 필터에 안 맞으면 목록에서 통째로 빠져서 핀도 안
      // 보였음. 방금 콕 집어 찾은 장소는 지금 필터가 뭐든 항상 보이게 예외 처리.
      // areaSearchListIds(검색창 직접 입력 후보 목록)도 마찬가지 — 목록에
      // 노출된 이상 카테고리 필터와 무관하게 항상 선택 가능해야 한다.
      if (kakaoSearchResultIds.has(place.id) || areaSearchListIds.has(place.id)) return true
      const matchCategory =
        filterMode !== 'category' || categories === 'all' || categories === place.category
      // 페르소나별 "전체"(starFilter 빈 배열)는 페르소나 태그가 붙은 장소 전체를
      // 보여주고, 하나 이상 고르면 그중 하나라도 일치하는 장소만 남긴다(다중선택).
      const matchStar =
        filterMode !== 'star' ||
        (starFilter.length > 0
          ? place.tags?.some((tag) => starFilter.includes(tag))
          : (place.tags?.length ?? 0) > 0)
      const matchSearch =
        !q ||
        place.name.toLowerCase().includes(q) ||
        place.address.toLowerCase().includes(q) ||
        place.tags?.some((tag) => tag.toLowerCase().includes(q))
      return matchCategory && matchStar && matchSearch
    })
  }, [candidates, categories, filterMode, starFilter, search, areaSearchedQuery, kakaoSearchResultIds, areaSearchListIds])

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
          fitPlaces={fitPlaces}
          selectedPlaceId={highlightedPlaceId ?? undefined}
          onSelectPlace={handleSelectPlace}
          onRequestLocation={handleRequestLocation}
          locationLabel={effectiveLocationLabel}
          onSearchArea={setSearchCenter}
          myLocation={isPrecise ? coords : null}
          highlightIds={kakaoSearchResultIds}
          compact={!isDesktop && mobilePanelState === 'full'}
          onKakaoStatusChange={setKakaoStatus}
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
        onSearchChange={handleSearchChange}
        onSubmitAreaSearch={handleSearchArea}
        isSearchingArea={areaSearchMutation.isPending}
        canSearchArea={canSearchArea}
        isMapLoading={isMapLoading}
        showSavedList={showSavedList}
        onShowSavedListChange={setShowSavedList}
        showAttractions={showAttractions}
        onShowAttractionsChange={setShowAttractions}
        onSelectAttraction={handleSelectAttraction}
        areaSearchLists={areaSearchLists}
        savedPlaces={savedPlaces}
        places={filtered}
        isLoading={isLoading}
        onSelectPlace={handleSelectPlace}
        center={effectiveCoords}
      />

      <PlaceDetailSheet
        place={selectedPlace}
        saved={selectedPlace ? savedIds.has(selectedPlace.id) : false}
        onClose={() => setSelectedPlace(null)}
        onToggleSave={toggleSave}
        showBackToRoute={Boolean(selectedPlace) && selectedPlace?.id === routeOriginPlaceId}
        onBackToRoute={() => navigate('../route')}
      />
    </div>
  )
}
