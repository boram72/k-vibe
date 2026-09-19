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
import { resolveAdminOfficeCoords } from '@/lib/kakao-admin-region'
import { fetchPersonaPlaces } from '@/api/personas'
import { usePageHelpStore } from '@/store/page-help-store'
import { useTourStore, canAutoStartTour } from '@/store/tour-store'
import { MAP_TOUR_KEY } from '@/blocks/tour/tour-steps'
import { useCurrentLocation, SEOUL_CENTER } from '@/lib/use-current-location'
import { useMediaQuery } from '@/lib/use-media-query'
import { Skeleton } from '@/components/ui/skeleton'
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

// 5-2(plan.md) — 검색결과/찜/연관관광지/SNS분석기/주변 스팟(또는 페르소나
// 방문 장소) 중 "지금 화면에 보여줄 딱 하나"를 가리키는 값. SpotListPanel도
// 이 타입을 그대로 써야 해서 모듈 스코프로 export.
export type ActiveSection = 'saved' | 'attractions' | 'searchResults' | 'analyzer' | null

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
  const startTour = useTourStore((s) => s.start)
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
  // 5-2(plan.md, 대화로 설계 확정) — 검색결과/찜/연관관광지/SNS분석기 섹션이
  // 예전엔 각자 독립된 boolean이라 여러 개가 동시에 켜지면 서로 영역을
  // 침범해서 "주변 스팟"이 화면 밖으로 밀려나는 문제가 있었음(Playwright로
  // 재현: 3개 동시 노출 시 "Nearby Spots" 타이틀이 뷰포트 밖으로 완전히 밀림).
  // "지금 보여줄 화면 하나"만 가리키는 단일 상태로 바꿔서 항상 최대 하나만
  // 노출되게 한다 — null이면 기본값인 주변 스팟(또는 페르소나 방문 장소).
  // 우선순위 원칙은 "방금 한 행동이 우선"(recency): 찜/연관관광지 토글,
  // 상호명 검색 성공, SNS 분석기 핸드오프 각각이 이 값을 자기 걸로 덮어쓰고,
  // 닫기(X) 버튼이나 이미 켜진 토글을 다시 누르면 null(기본)로 돌아간다.
  // "내 루트"에서 온 핸드오프(returnToRoute, 항상 단일 장소)는 SNS 분석기와
  // 달리 자기만의 섹션을 안 만듦 — 초기값 계산에서 제외(대화로 확정, 아래
  // routeOriginPlaceId 참고 — 그 장소는 주변 스팟 목록에 태그만 붙여 표시).
  const [activeSection, setActiveSection] = useState<ActiveSection>(() =>
    focusPlaces.length && !focusState?.returnToRoute ? 'analyzer' : null,
  )

  // 찜/연관관광지 토글 버튼 — 예전엔 각자 독립된 boolean이라 둘 다 동시에 켜는
  // 중복 클릭이 가능했음(대화 중 발견) — activeSection 하나로 흡수해서
  // 하나를 켜면 다른 하나는 자동으로 꺼지도록(동시 노출 자체가 불가능하게) 수정.
  // 이미 켜진 걸 다시 누르면 껐던 것과 동일하게 null(기본 목록)로 복귀.
  function toggleSavedSection() {
    setActiveSection((prev) => (prev === 'saved' ? null : 'saved'))
  }
  function toggleAttractionsSection() {
    setActiveSection((prev) => (prev === 'attractions' ? null : 'attractions'))
  }
  // 검색결과(5-4)/SNS분석기 섹션 공용 닫기 핸들러 — 둘 다 "그 섹션을 지금
  // 화면에서 보여주는 상태"만 끄고 원본 데이터(areaSearchLists/focusPlaces)는
  // 안 건드린다. 닫으면 기본값(주변 스팟/페르소나 방문 장소)으로 복귀.
  function closeActiveSection() {
    setActiveSection(null)
  }
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

  // 2026-09 대화 중 요청 — 우측 하단(검정) 버튼 전용 오버라이드. focusPlaces
  // 핸드오프가 있는 동안은 effectiveCoords/effectiveLocationLabel이 항상
  // focusPlaces[0]을 우선하므로, 그 버튼을 눌러도 뷰가 절대 실제 GPS로
  // 못 돌아가는 문제가 있었음(대화 중 발견) — 이 플래그가 true인 동안만
  // focusPlaces 우선순위를 해제한다. queryCoords(백엔드로 나가는 검색 좌표)는
  // 이 플래그와 무관하게 focusPlaces[0]을 계속 우선한다("현재위치 버튼은
  // 카메라만 이동, 검색 상태는 안 건드림" 원칙 — 위 queryCenter 주석 참고).
  const [viewIgnoresFocus, setViewIgnoresFocus] = useState(false)

  // Focus-place handoffs (Analyze/Persona/Radar → "view on map") re-center the
  // search around that place instead of the user's literal current location.
  const effectiveCoords = focusPlaces[0] && !viewIgnoresFocus
    ? { lat: focusPlaces[0].lat, lng: focusPlaces[0].lng }
    : (searchCenter ?? coords)

  // 2026-09 — 위치기반서비스사업자 등록 없이 배포하려면 실측 GPS를 백엔드로
  // 보내면 안 됨(plan.md 6번). effectiveCoords(위)는 지도 뷰 중심·카카오
  // 클라이언트사이드 검색 힌트용으로 실측 GPS를 그대로 써도 되지만(브라우저
  // 밖으로 안 나감), 우리 백엔드로 나가는 값(/places, /attractions/related)은
  // queryCenter라는 완전히 독립된 state로 분리 — setSearchCenter를 부르는
  // 딱 4곳(주소 매칭 2곳, 관광지 키워드 매칭 1곳, 드래그확인 "이 지역에서
  // 검색" 1곳)에서만 같이 갱신되고, "현재위치" 버튼(GPS 갱신)으로는 절대
  // 안 바뀐다. effectiveCoords의 파생값이 아니라서 handleRequestLocation이
  // searchCenter를 null로 되돌려 뷰가 GPS를 되찾아도 queryCenter는 전혀
  // 영향받지 않는다.
  const [queryCenter, setQueryCenter] = useState(effectiveCoords)
  const queryCoords = focusPlaces[0] ? { lat: focusPlaces[0].lat, lng: focusPlaces[0].lng } : queryCenter

  // 4번(plan.md) — "지금 지도가 실제로 보여주는 위치"를 MapCanvas가 그대로
  // 올려준다(드래그 중/장소 선택 팬/확정된 center 변경 전부 포함). 상호명
  // 검색(검색창)/관광지 추천 클릭이 카카오 keywordSearch에 넘기는 위치
  // 힌트(near)가 지금은 이걸 몰라서 effectiveCoords(마지막으로 "확정"된 검색
  // 중심)만 써서, 드래그나 장소 선택으로 카메라가 이미 다른 곳으로 옮겨간
  // 뒤에도 검색 힌트만 옛 위치인 채로 어긋나던 문제 — 예: 서울에서 "불국사"를
  // 검색해 클릭하면 경주로 카메라는 이동하지만(handleSelectPlace는
  // searchCenter를 안 건드림), 그 직후 검색 힌트는 여전히 서울 근처였음.
  // searchCenter/queryCenter(=/places 재조회, 실제 검색 확정 상태)는 이 값과
  // 완전히 무관 — 이 state는 검색 힌트 계산에만 쓰이고, 지도 데이터 재조회나
  // center prop 자체를 절대 건드리지 않는다.
  const [realCameraCenter, setRealCameraCenter] = useState(effectiveCoords)

  function handleRequestLocation() {
    setSearchCenter(null)
    setKakaoSearchResults([])
    setAreaSearchLists(null)
    setHighlightedPlaceId(null)
    requestLocation()
  }

  // 우측 하단(검정) 버튼 전용 — focusPlaces 핸드오프 유무와 무관하게 항상
  // 실제 GPS로 강제 이동해야 하므로, viewIgnoresFocus를 켜서 effectiveCoords/
  // effectiveLocationLabel의 focusPlaces 우선순위 자체를 해제한 뒤 기존
  // handleRequestLocation과 동일하게 처리한다.
  function handleForceCurrentLocation() {
    setViewIgnoresFocus(true)
    handleRequestLocation()
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
        // 보여줄 목록 섹션 자체가 없으므로 기본값(주변 스팟)으로 복귀.
        setSearchCenter(result.center)
        setQueryCenter(result.center)
        setKakaoSearchResults([])
        setAreaSearchLists(null)
        setActiveSection(null)
      } else {
        // 랜드마크/상호명 매칭 — 자동 이동하지 않고 정확도순/거리순 목록만
        // 노출. 지도 이동·강조는 사용자가 목록에서 직접 골랐을 때만.
        // 5-2(plan.md) — "방금 한 행동이 우선" 원칙: 검색 성공 시 검색결과
        // 섹션으로 전환(찜/연관관광지 등 켜져 있던 다른 섹션은 자동으로 닫힘).
        setKakaoSearchResults([])
        setAreaSearchLists({ relevance: result.relevance, distance: result.distance })
        setActiveSection('searchResults')
      }
      // 검색어를 지우지 않고 남겨서 뭘 검색했는지 보이게 함(대화 중 요청) —
      // areaSearchedQuery를 같이 기록해서, 이 텍스트가 그대로인 동안은 방금
      // 받아온 결과를 다시 텍스트로 거르지 않게 한다(아래 filtered 참고).
      setAreaSearchedQuery(variables.query)
    },
  })

  function handleSearchArea() {
    if (!search.trim() || areaSearchMutation.isPending) return
    areaSearchMutation.mutate({ query: search, near: realCameraCenter })
  }

  // 6번 — "관광지 추천" 리스트 항목 클릭. TourAPI 연관관광지 응답엔 좌표가
  // 없어서(이름/지역명뿐) 이름으로 카카오 검색을 직접 날려 위치를 찾는다.
  // 검색창(search)은 건드리지 않음 — 사용자가 타이핑한 검색어가 아니라
  // 목록 클릭이라 검색창에 남길 이유가 없음(대화 중 요청).
  const attractionSearchMutation = useMutation({
    mutationFn: (name: string) => searchKakaoArea(name, realCameraCenter),
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
        setQueryCenter(result.center)
        setKakaoSearchResults([])
      } else if (result.relevance.length > 0) {
        const target = { lat: result.relevance[0].lat, lng: result.relevance[0].lng }
        setSearchCenter(target)
        setQueryCenter(target)
        setKakaoSearchResults(result.relevance)
      }
    },
  })

  function handleSelectAttraction(name: string) {
    if (attractionSearchMutation.isPending) return
    attractionSearchMutation.mutate(name)
  }

  // 실제 카카오 지도(services 라이브러리)가 있을 때만 의미 있는 기능 — 퍼센트
  // 좌표 폴백 모드에서는 kakao.maps.services 자체가 없어 항상 null만 돌아온다.
  const canSearchArea = Boolean(import.meta.env.VITE_KAKAO_MAP_KEY)

  const { data: places = [], isLoading } = useQuery({
    queryKey: ['map-places', queryCoords.lat, queryCoords.lng, i18n.language],
    queryFn: () =>
      fetchMapPlaces({
        lat: queryCoords.lat,
        lng: queryCoords.lng,
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

  // 처음 지도 화면에 들어온 사용자에게만 자동으로 투어를 띄운다 — 재방문
  // 시에는 "?" 자리의 투어 버튼을 눌러야만 다시 보인다. 사이트 첫 방문
  // 기간이 이미 끝났거나(canAutoStartTour) "다시 보지 않기"를 눌렀으면
  // 이 페이지가 처음이어도 뜨지 않는다.
  useEffect(() => {
    if (canAutoStartTour(MAP_TOUR_KEY)) startTour(MAP_TOUR_KEY)
  }, [startTour])

  // Guards against StrictMode's dev-only double-invoke of mount effects —
  // without this, requestLocation() fires twice on a denied/unavailable
  // geolocation request, producing two identical toasts. The ref persists
  // across that synthetic remount, so the second invocation is a no-op.
  // 2026-09 — 관할 정부처 랜딩(아래)이 확정되기 전까진 실측 GPS 위치가
  // 잠깐 화면에 보였다가 정부처 좌표로 "점프"하는 게 버그처럼 보인다는
  // 피드백 — focus 핸드오프가 없을 때만 켜서, 랜딩이 정해질 때까지 지도
  // 자리에 스켈레톤을 보여주고 실측 위치 자체를 노출하지 않는다.
  const [isResolvingLanding, setIsResolvingLanding] = useState(!focusPlaces.length)

  const didRequestLocationRef = useRef(false)
  useEffect(() => {
    if (!focusPlaces.length && !didRequestLocationRef.current) {
      didRequestLocationRef.current = true
      // 2026-09 — plan.md 6-1. 초기 랜딩은 실측 GPS(또는 마지막 위치 캐시/서울
      // 폴백)가 뭐로 정해지든, 그 좌표를 그대로 검색에 쓰지 않고 행정구역
      // 판별 후 관할 정부처 좌표로 변환해서만 지도 뷰·서버 검색에 반영한다
      // (setSearchCenter/setQueryCenter — 6-2에서 만든 "명시적 트리거" 경로를
      // 그대로 재사용). 관할 정부처를 못 찾으면(SDK 미로드/지오코딩 실패 등)
      // 실측 GPS로 폴백하면 우회 자체가 무의미해지므로 **서울시청(SEOUL_CENTER)
      // 으로 디폴트 랜딩**한다.
      requestLocation().then((resolved) => {
        resolveAdminOfficeCoords(resolved).then((office) => {
          const landing = office ?? SEOUL_CENTER
          setSearchCenter(landing)
          setQueryCenter(landing)
          setIsResolvingLanding(false)
        })
      })
    }
    // run once on mount only — focusState is a one-time handoff, not a live dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isShowingAnalysisResult = focusPlaces.length > 0 && !viewIgnoresFocus
  const effectiveLocationLabel = isShowingAnalysisResult ? t('map.analysis_result') : locationLabel

  // 5-3(plan.md) — "주변 스팟" 목록의 타이틀. 페르소나별(스타별) 탭일 때는
  // "주변"이 아니라 "페르소나 방문 장소"가 더 정확한 설명이라 그 문구로 바꾼다.
  // (SNS 분석기 결과는 더 이상 이 타이틀/목록에 안 섞임 — 아래 analyzerPlaces
  // 참고, 자기만의 독립된 섹션으로 분리됨.)
  const spotListTitle = filterMode === 'star' ? t('map.persona_visited_places_title') : t('map.nearby_spots')

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

  // 5-1/5-2(plan.md) — "주변 스팟" 목록에는 SNS 분석기 섹션이 지금 활성화된
  // 동안만 그 항목(focusPlaces)이 안 섞여야 함(자기만의 독립 섹션으로 따로
  // 보여줌). SNS 분석기 섹션을 닫으면(activeSection이 'analyzer'가 아니게
  // 되면) 그 항목들이 다시 "주변 스팟"에 합쳐져 보여야 하므로 activeSection도
  // 같이 체크.
  const nearbySpotListPlaces = useMemo(
    () =>
      activeSection === 'analyzer' ? filtered.filter((p) => !focusPlaces.some((f) => f.id === p.id)) : filtered,
    [filtered, focusPlaces, activeSection],
  )

  // 5-2(plan.md, 대화 중 요청) — 지도에 표시되는 핀은 항상 "지금 화면에 보이는
  // 목록"과 정확히 일치해야 한다(찜/연관관광지/SNS분석기/검색결과/주변 스팟
  // 전부 동일 원칙) — 목록에 없는 장소는 지도에도 안 보임. SNS 분석기를
  // 닫으면 지도 뷰(카메라)는 그대로 두고 그 장소들만 지도에서 사라지되, 그
  // 장소가 마침 "주변 스팟"에도 포함되는 경우(반경 내 실제 장소)엔 계속
  // 보인다 — activeSection이 바뀌면서 자연히 nearbySpotListPlaces로 전환되고,
  // 거기 포함 여부에 따라 저절로 남거나 빠지는 방식이라 별도 처리 불필요.
  // 연관 관광지 추천(attractions)은 항목 자체에 좌표가 없어(클릭해야 카카오
  // 검색으로 위치를 찾음) 핀으로 보여줄 게 없음 — 빈 배열.
  const mapPlaces = useMemo(() => {
    if (activeSection === 'analyzer') return focusPlaces
    if (activeSection === 'searchResults') return areaSearchListPlaces
    if (activeSection === 'saved') return savedPlaces
    if (activeSection === 'attractions') return []
    return nearbySpotListPlaces
  }, [activeSection, focusPlaces, areaSearchListPlaces, savedPlaces, nearbySpotListPlaces])

  // SNS 분석기 섹션이 활성화된 동안엔 그 스팟 전부가 "이 지역에서 검색"
  // 결과와 동일하게 빨간 핀으로 강조된다(대화 중 요청) — 닫으면(activeSection
  // 이 바뀌면) mapPlaces 자체가 달라지므로 강조도 자연히 사라짐.
  const mapHighlightIds = useMemo(() => {
    if (activeSection === 'analyzer') return new Set(focusPlaces.map((p) => p.id))
    return kakaoSearchResultIds
  }, [activeSection, focusPlaces, kakaoSearchResultIds])


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
      <div className={cn('relative min-h-0 md:h-full md:flex-none', !isDesktop ? mobileMapFlexClass(mobilePanelState) : 'flex-4')}>
        {/* MapCanvas는 랜딩 확정 여부와 무관하게 항상 마운트해둔다 — 카카오
            SDK 로딩(useKakaoLoader)이 이 컴포넌트 안에서 일어나므로, 스켈레톤이
            이걸 통째로 가려버리면 SDK 자체가 안 떠서 5초 타임아웃 후 항상
            서울로만 폴백되는 버그가 있었음(실사용 재현으로 발견). 스켈레톤은
            그 위에 겹쳐서 SDK가 백그라운드에서 계속 로드되게 한다. */}
        <MapCanvas
          center={effectiveCoords}
          places={mapPlaces}
          fitPlaces={fitPlaces}
          selectedPlaceId={highlightedPlaceId ?? undefined}
          onSelectPlace={handleSelectPlace}
          onRequestLocation={handleRequestLocation}
          onForceCurrentLocation={handleForceCurrentLocation}
          locationLabel={effectiveLocationLabel}
          isAnalysisResult={isShowingAnalysisResult}
          onSearchArea={(coord) => {
            setSearchCenter(coord)
            setQueryCenter(coord)
          }}
          onCameraCenterChange={setRealCameraCenter}
          myLocation={isPrecise ? coords : null}
          highlightIds={mapHighlightIds}
          compact={!isDesktop && mobilePanelState === 'full'}
        />
        {/* z-30 — 카카오 지도 SDK가 내부적으로 위치버튼/줌컨트롤/현재위치 핀에
            z-10~20을 쓰고 있어서, 그보다 확실히 위여야 실측 GPS 위치가 잠깐
            비쳐 보이는 일 없이 스켈레톤이 완전히 가린다(실사용 확인 후 조정). */}
        {isResolvingLanding && <Skeleton className="absolute inset-0 z-30 h-full w-full rounded-none" />}
      </div>

      {isResolvingLanding ? (
        <div className="flex flex-col gap-3 border-t border-border p-4 md:border-l md:border-t-0">
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : (
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
          activeSection={activeSection}
          showSavedList={activeSection === 'saved'}
          onToggleSavedList={toggleSavedSection}
          showAttractions={activeSection === 'attractions'}
          onToggleAttractions={toggleAttractionsSection}
          onSelectAttraction={handleSelectAttraction}
          areaSearchLists={areaSearchLists}
          onCloseAreaSearchResults={closeActiveSection}
          analyzerPlaces={focusPlaces}
          onCloseAnalyzerSection={closeActiveSection}
          routeOriginPlaceId={routeOriginPlaceId}
          savedPlaces={savedPlaces}
          places={nearbySpotListPlaces}
          isLoading={isLoading}
          onSelectPlace={handleSelectPlace}
          center={queryCoords}
          listTitle={spotListTitle}
        />
      )}

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
