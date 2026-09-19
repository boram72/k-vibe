import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LocateFixed, MapPin, ScanSearch } from 'lucide-react'
import { Map as KakaoMap, CustomOverlayMap, useKakaoLoader } from 'react-kakao-maps-sdk'
import { Button } from '@/components/ui/button'
import { CurrentLocationPin } from '@/blocks/common/current-location-pin'
import { cn } from '@/lib/utils'
import { getPlaceCategoryMeta, type Place } from '@/types/place'

interface Coordinates {
  lat: number
  lng: number
}

interface MapCanvasProps {
  center: Coordinates
  places: Place[]
  fitPlaces?: Place[]
  // 5-3/7번(plan.md) — fitPlaces가 페르소나별 bounds-fit용일 때만 true로
  // 내려줌(SNS 분석기 핸드오프 땐 false/미지정). true면 bounds 계산에 현재
  // 카메라 위치(center)도 같이 포함시켜 "점프"가 아니라 "확대"가 되게 한다.
  includeCameraInFit?: boolean
  selectedPlaceId?: string
  // 10번(plan.md) — 같은 장소를 다시 클릭해도 selectedPlaceId 값 자체는 안
  // 바뀌므로(부모가 동일 값 setState를 하면 리렌더 없이 무시됨) 이 컴포넌트가
  // "선택이 안 바뀌었다"고 오판해 focusCenter를 다시 안 세팅하던 문제가
  // 있었음. 클릭할 때마다(같은 장소여도) 무조건 증가하는 값을 같이 받아서,
  // id가 같아도 "방금 또 선택했다"를 감지할 수 있게 한다.
  selectionSeq?: number
  onSelectPlace: (place: Place) => void
  onRequestLocation: () => void
  // 2026-09 대화 중 요청 — 왼쪽 상단 라벨 버튼(LocationOverlay, onRequestLocation)과
  // 달리, 우측 하단 아이콘 버튼(MapActionButtons)은 SNS 분석기 등에서 넘어온
  // focusPlaces 핸드오프와 무관하게 항상 실제 GPS로 뷰를 강제 이동시킨다.
  // 별도 핸들러가 필요한 이유: onRequestLocation은 GPS를 새로 받아오기만 할
  // 뿐 effectiveCoords의 focusPlaces 우선순위 자체를 못 이기므로, MapPage가
  // 그 우선순위를 해제하는 로직까지 같이 실행해야 함.
  onForceCurrentLocation: () => void
  locationLabel: string
  // locationLabel이 "분석결과"(SNS 분석기 핸드오프)를 보여주는 중인지 —
  // LocationOverlay가 이때만 다른 아이콘(ScanSearch)으로 바꿔서 "이건 GPS가
  // 아니라 분석결과 위치"임을 구분되게 표시한다.
  isAnalysisResult?: boolean
  // 팀 태스크보드 5번 — 지도를 드래그해서 옮긴 뒤 "이 지역에서 검색"을 누르면
  // 그 위치를 새 검색 중심으로 승격한다. 실제 카카오 지도(드래그 가능)에서만
  // 의미가 있어 PercentMapCanvas(정적 미리보기) 쪽은 이 prop을 쓰지 않는다.
  onSearchArea?: (coords: Coordinates) => void
  // 4번(plan.md) — "지금 지도가 실제로 보여주고 있는 위치"를 부모(MapPage)에
  // 그대로 올려준다. 드래그(아직 "이 지역에서 검색" 미확정), 장소 선택으로
  // 카메라가 팬되는 경우(검색 후보 목록 클릭 등 selectedPlaceId 변경), GPS
  // 갱신/검색 확정(center prop 변경) 전부 포함 — 검색창 직접 입력(상호명
  // 검색)이 카카오 keywordSearch에 넘기는 위치 힌트(near)가 지금은 이걸 몰라서
  // "마지막으로 확정된 검색 중심"(effectiveCoords)만 쓰는 바람에, 드래그나
  // 장소 선택으로 카메라가 이미 다른 곳으로 옮겨간 뒤에도 검색 힌트만 옛
  // 위치인 채로 어긋나는 문제가 있었음(예: 서울에서 "불국사" 클릭 → 경주로
  // 이동 → 바로 "스타벅스" 검색 → 여전히 서울 근처 결과가 나옴).
  // searchCenter/queryCenter(=/places 재조회, 실제 검색 확정 상태)는 이 값과
  // 완전히 무관 — 이 콜백은 검색 힌트 계산용 참고 상태만 올려줄 뿐, 지도
  // 데이터 재조회나 지도 중심(center prop) 자체를 절대 건드리지 않는다.
  onCameraCenterChange?: (coords: Coordinates) => void
  // 팀 태스크보드 12번 — 실제 GPS 실측값일 때만 부모(MapPage)가 채워서 내려줌
  // (마지막 위치 캐시/서울 폴백일 땐 null로 내려와 마커를 안 그림 — 실제로 그
  // 자리에 있는 것처럼 오해하지 않도록). route-mini-map.tsx의 빨간 펄스
  // 마커(`CurrentLocationPin`)를 그대로 재사용.
  myLocation?: Coordinates | null
  // 2026-09 QA 8번 — "이 지역에서 검색"(카카오 상호명 검색)으로 찾은 결과는
  // 다른 핀들 사이에 카테고리색 그대로 섞여 있으면 눈에 잘 안 띈다는 피드백
  // (실사용 확인) — 여기 담긴 id의 핀만 카테고리색 대신 빨간색으로 강조 표시.
  highlightIds?: Set<string>
  // 모바일 스팟 목록 패널이 "전체화면" 단계일 때 지도를 아주 작게 눌러줘야
  // 하는데, 아래 두 렌더러의 루트 div가 원래 min-h-70(280px)을 갖고 있어서
  // 부모가 h-16(64px)만 줘도 이 min-height가 이겨버려 지도가 그대로 280px를
  // 차지하며 패널 상단(스와이프 핸들 등)을 덮어버리는 버그가 있었다
  // (elementFromPoint()로 실제 확인). true면 그 최소 높이 자체를 없앤다.
  compact?: boolean
}

// Icon-badge pins colored per category (types/place.ts PLACE_CATEGORIES.pinBg) —
// same pattern as radar-map-preview.tsx's facility pins. The map tiles are
// colorful, so pins need a color that doesn't blend into the neutral
// zinc-theme tokens used elsewhere; category color also doubles as a legend.
function pinClassName(selected: boolean, pinBg: string) {
  return cn(
    'flex h-8 w-8 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105',
    pinBg,
    selected && 'scale-110 ring-2 ring-white',
  )
}

// 2026-09 QA 8번 — "이 지역에서 검색" 결과는 다른 카테고리 원형 배지와 섞이면
// 안 띈다는 피드백으로, 실제 지도 마커에 가까운(아래가 뾰족한) 핀 모양으로
// 따로 표시한다. lucide MapPin 자체가 그 핀 실루엣이라 원형 배지 없이
// 아이콘만 크게 채워서 씀 — 뾰족한 끝이 실제 좌표를 가리키게 앵커도 아래쪽으로.
function SearchResultPin({ selected }: { selected: boolean }) {
  return (
    <MapPin
      className={cn(
        // MapPin은 몸통(path)과 가운데 점(circle)이 같은 fill을 상속받아서,
        // circle만 따로 흰색으로 덮어써 실제 핀처럼 가운데가 뚫려 보이게 함.
        'h-9 w-9 fill-red-500 stroke-red-800 drop-shadow-md transition-transform hover:scale-105 [&_circle]:fill-white',
        selected && 'scale-110',
      )}
      strokeWidth={1.5}
    />
  )
}

function hasValidCoordinates(place: Pick<Place, 'lat' | 'lng'>): boolean {
  return Number.isFinite(place.lat) && Number.isFinite(place.lng)
}

function buildPlaceBounds(places: Place[]) {
  if (places.length === 0) return null
  return places.reduce(
    (bounds, place) => ({
      minLat: Math.min(bounds.minLat, place.lat),
      maxLat: Math.max(bounds.maxLat, place.lat),
      minLng: Math.min(bounds.minLng, place.lng),
      maxLng: Math.max(bounds.maxLng, place.lng),
    }),
    { minLat: places[0].lat, maxLat: places[0].lat, minLng: places[0].lng, maxLng: places[0].lng },
  )
}

// 5-3/7번(plan.md) — includeCoord가 있으면(페르소나별 bounds-fit 전용) 그
// 좌표(사용자의 현재 카메라 위치)도 같이 담아서 bounds를 계산한다 — "그
// 스팟들이 있는 곳으로 점프"가 아니라 "지금 위치 포함해서 확대"가 되도록.
// SNS 분석기(focusPlaces) 쪽은 이 인자를 안 넘겨서 기존처럼 분석된 스팟만
// 기준으로 동작(GPS 섞으면 오히려 "분석된 곳으로 바로 보여주기" 목적과 어긋남).
// includeCoord가 있으면 장소가 1개뿐이어도 항상 bounds 경로를 써야
// 그 좌표와 장소를 같이 담을 수 있다.
function fitKakaoMapToPlaces(map: kakao.maps.Map, places: Place[], includeCoord?: Coordinates) {
  if (typeof kakao === 'undefined' || !kakao.maps || places.length === 0) return

  if (places.length === 1 && !includeCoord) {
    map.setCenter(new kakao.maps.LatLng(places[0].lat, places[0].lng))
    map.setLevel(4)
    return
  }

  const bounds = new kakao.maps.LatLngBounds()
  places.forEach((place) => bounds.extend(new kakao.maps.LatLng(place.lat, place.lng)))
  if (includeCoord) bounds.extend(new kakao.maps.LatLng(includeCoord.lat, includeCoord.lng))
  map.setBounds(bounds, 48, 48, 48, 48)
}

// Tapping the badge itself recenters the map on the user's current location —
// no need to also parse the raw lat/lng it used to show underneath.
//
// z-10 on this and MapActionButtons below (2026-09 태스크보드 4번 버그 수정):
// relying on plain DOM order for stacking over <KakaoMap> worked in the
// percent-coordinate fallback, but the real Kakao Maps SDK renders its own
// internal SVG layer that painted over these buttons once a real map key was
// configured — confirmed on the deployed site via elementFromPoint() at the
// button's own coordinates returning a kakao SVG node, not the button. Same
// class of bug (and same fix) as route-mini-map.tsx's Directions button.
function LocationOverlay({
  locationLabel,
  onRequestLocation,
  isAnalysisResult,
}: {
  locationLabel: string
  onRequestLocation: () => void
  isAnalysisResult?: boolean
}) {
  const { t } = useTranslation()
  const Icon = isAnalysisResult ? ScanSearch : LocateFixed
  return (
    <button
      type="button"
      onClick={onRequestLocation}
      title={t('map.refresh_location')}
      className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-xl border border-border bg-popover/90 px-3 py-2 backdrop-blur transition-colors hover:bg-popover"
    >
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="text-xs font-semibold text-popover-foreground">{locationLabel}</span>
    </button>
  )
}

// Standalone "open the analyzer" shortcut was removed — SNS 분석기 already has
// its own bottom-nav/sidebar tab, so this was a redundant second entry point.
function MapActionButtons({ onForceCurrentLocation }: { onForceCurrentLocation: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-2">
      <Button
        size="icon"
        data-tour="map-locate"
        onClick={onForceCurrentLocation}
        title={t('map.refresh_location')}
        aria-label={t('map.refresh_location')}
      >
        <LocateFixed className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Percent-based pin placement — fallback used whenever VITE_KAKAO_MAP_KEY isn't
// configured, or the real SDK fails to load. Mirrors src/api/client.ts's
// withFallback() philosophy: degrade gracefully instead of breaking the page.
function pinPosition(coord: Coordinates, center: Coordinates, fitPlaces: Place[] = []) {
  const bounds = buildPlaceBounds(fitPlaces)
  if (bounds && fitPlaces.length > 1) {
    const minSpan = 0.01
    const latSpan = Math.max(bounds.maxLat - bounds.minLat, minSpan)
    const lngSpan = Math.max(bounds.maxLng - bounds.minLng, minSpan)
    const centerLat = (bounds.maxLat + bounds.minLat) / 2
    const centerLng = (bounds.maxLng + bounds.minLng) / 2
    const pad = 0.2
    const minLat = centerLat - (latSpan / 2) * (1 + pad)
    const maxLat = centerLat + (latSpan / 2) * (1 + pad)
    const minLng = centerLng - (lngSpan / 2) * (1 + pad)
    const maxLng = centerLng + (lngSpan / 2) * (1 + pad)

    return {
      left: `${Math.max(8, Math.min(92, ((coord.lng - minLng) / (maxLng - minLng)) * 100))}%`,
      top: `${Math.max(10, Math.min(88, ((maxLat - coord.lat) / (maxLat - minLat)) * 100))}%`,
    }
  }

  const lngOffset = (coord.lng - center.lng) * 2600
  const latOffset = (center.lat - coord.lat) * 3600
  const left = Math.max(8, Math.min(92, 50 + lngOffset))
  const top = Math.max(10, Math.min(88, 50 + latOffset))
  return { left: `${left}%`, top: `${top}%` }
}

function PercentMapCanvas({
  center,
  places,
  fitPlaces = [],
  selectedPlaceId,
  onSelectPlace,
  onRequestLocation,
  onForceCurrentLocation,
  locationLabel,
  isAnalysisResult,
  myLocation,
  compact,
  highlightIds,
}: MapCanvasProps) {
  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-muted', compact ? 'min-h-0' : 'min-h-70')}>
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
        <MapPin className="h-12 w-12" />
      </div>

      {places.map((place) => {
        const selected = place.id === selectedPlaceId
        // 다중 검색결과(highlightIds)는 그대로 다 빨간 핀 유지 + 그 중 하나를
        // 클릭해서 selected가 되면 스타일만 커짐(SearchResultPin의 selected prop).
        // 여기에 더해, 검색과 무관하게 그냥 선택된 장소(주변 스팟 리스트 클릭,
        // 지도 핀 직접 클릭 등)도 동일한 빨간 핀으로 보여줘서 "지금 선택된 곳이
        // 어디인지"가 하나의 핀으로 항상 따라다니게 한다(대화로 확정).
        const showSearchPin = highlightIds?.has(place.id) || selected
        const { icon: Icon, pinBg } = getPlaceCategoryMeta(place.category)
        return (
          <button
            key={place.id}
            type="button"
            onClick={() => onSelectPlace(place)}
            title={place.name}
            style={pinPosition(place, center, fitPlaces)}
            className={cn(
              'absolute -translate-x-1/2',
              showSearchPin ? '-translate-y-full' : '-translate-y-1/2',
              // KakaoMapCanvas와 동일한 이유 — 빨간 강조 핀이 몰린 카테고리
              // 핀들에 가려지지 않도록 우선순위를 높임.
              showSearchPin ? (selected ? 'z-20' : 'z-10') : 'z-0',
            )}
          >
            {showSearchPin ? (
              <SearchResultPin selected={selected} />
            ) : (
              <span className={pinClassName(selected, pinBg)}>
                <Icon className="h-3.75 w-3.75" />
              </span>
            )}
          </button>
        )
      })}

      {myLocation && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={pinPosition(myLocation, center, fitPlaces)}
        >
          <CurrentLocationPin />
        </div>
      )}

      <LocationOverlay locationLabel={locationLabel} onRequestLocation={onRequestLocation} isAnalysisResult={isAnalysisResult} />
      <MapActionButtons onForceCurrentLocation={onForceCurrentLocation} />
    </div>
  )
}

// 팀 태스크보드 5번 — 지도를 손으로 옮기면 뜨는 "이 지역에서 검색" 버튼.
// LocationOverlay/MapActionButtons와 겹치지 않게 상단 중앙에 배치, 동일하게 z-10.
function SearchAreaButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-xl bg-neutral-900/90 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur transition-colors hover:bg-neutral-900"
    >
      {t('map.search_this_area')}
    </button>
  )
}

function KakaoMapCanvas(props: MapCanvasProps) {
  const {
    center,
    places,
    fitPlaces = [],
    includeCameraInFit,
    selectedPlaceId,
    selectionSeq,
    onSelectPlace,
    onRequestLocation,
    onForceCurrentLocation,
    locationLabel,
    isAnalysisResult,
    onSearchArea,
    onCameraCenterChange,
    myLocation,
    compact,
    highlightIds,
  } = props
  const boundedPlaces = useMemo(() => fitPlaces.filter(hasValidCoordinates), [fitPlaces])
  const boundsKey = boundedPlaces.map((place) => `${place.id}:${place.lat},${place.lng}`).join('|')
  // Explicit https:// — the SDK's default loader URL is protocol-relative
  // ("//dapi.kakao.com/..."), which resolves to http:// on our http://localhost
  // dev server. Kakao's CDN rejects plain http requests (ERR_BLOCKED_BY_ORB).
  // libraries: ['services'] — 팀 태스크보드 6번(동네검색)에서 쓰는
  // kakao.maps.services.Places().keywordSearch()에 필요. 기본 로드에는
  // 포함되지 않는 별도 라이브러리라 명시해야 함(src/lib/kakao-area-search.ts 참고).
  const [loading, error] = useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_MAP_KEY,
    url: 'https://dapi.kakao.com/v2/maps/sdk.js',
    libraries: ['services'],
  })

  useEffect(() => {
    if (error) console.warn('[map] Kakao Maps SDK failed to load, falling back to percent-coordinate preview:', error)
  }, [error])

  // Selecting a place (map pin or list item — same onSelectPlace handler)
  // pans the camera to it and the camera stays there even after the detail
  // sheet closes (selectedPlaceId clears) — closing the sheet shouldn't snap
  // the view back. Only a genuinely new search center (GPS refresh, an
  // incoming focus place from another page) clears the override.
  //
  // Implemented as "adjusting state during render" (the pattern React docs
  // recommend over an effect for this exact case: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // — comparing against the previous render's props and calling setState
  // directly in the render body, which React applies before committing
  // instead of running it as a separate, extra-render effect. Declared
  // before the loading/error early-return below so hook order stays stable.
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [focusCenter, setFocusCenter] = useState<Coordinates | null>(null)
  const [map, setMap] = useState<kakao.maps.Map | null>(null)
  const [prevCenter, setPrevCenter] = useState(center)
  const [prevBoundsKey, setPrevBoundsKey] = useState(boundsKey)
  const [prevSelectedPlaceId, setPrevSelectedPlaceId] = useState(selectedPlaceId)
  const [prevSelectionSeq, setPrevSelectionSeq] = useState(selectionSeq)
  // 팀 태스크보드 5번 — 드래그로 옮긴 뒤 아직 "이 지역에서 검색"을 누르기 전인
  // 좌표. 실제 검색 중심(center prop)이 바뀌면(= 검색이 확정되면) 같이 비운다.
  const [pendingCenter, setPendingCenter] = useState<Coordinates | null>(null)

  if (center.lat !== prevCenter.lat || center.lng !== prevCenter.lng) {
    setPrevCenter(center)
    setFocusCenter(null)
    setPendingCenter(null)
  }
  if (boundsKey !== prevBoundsKey) {
    setPrevBoundsKey(boundsKey)
    setFocusCenter(null)
  }
  if (selectedPlaceId !== prevSelectedPlaceId || selectionSeq !== prevSelectionSeq) {
    setPrevSelectedPlaceId(selectedPlaceId)
    setPrevSelectionSeq(selectionSeq)
    const place = places.find((p) => p.id === selectedPlaceId)
    if (place) setFocusCenter({ lat: place.lat, lng: place.lng })
  }

  // 4번(plan.md) — "실제로 지금 지도가 보여주는 위치"의 단일 소스. 드래그
  // 중(pendingCenter)이 최우선, 그다음 장소 선택으로 팬된 위치(focusCenter),
  // 둘 다 없으면 확정된 center prop. 위 onCameraCenterChange 주석 참고.
  const realCameraCenter = pendingCenter ?? focusCenter ?? center
  useEffect(() => {
    onCameraCenterChange?.(realCameraCenter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realCameraCenter.lat, realCameraCenter.lng, onCameraCenterChange])

  useEffect(() => {
    if (!map || focusCenter || boundedPlaces.length === 0) return
    fitKakaoMapToPlaces(map, boundedPlaces, includeCameraInFit ? center : undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundedPlaces, boundsKey, focusCenter, map, includeCameraInFit, center.lat, center.lng])

  // 6번(plan.md) — <KakaoMap level={4}>는 매 렌더 항상 같은 리터럴 값이라,
  // react-kakao-maps-sdk가 마운트 이후엔 "안 바뀌었다"고 보고 setLevel()을
  // 다시 안 부름. 그런데 fitKakaoMapToPlaces()(여러 장소 담기)는 map.setBounds()
  // 로 줌 레벨을 React 밖에서 직접 바꿔버리므로, 그 후 특정 장소 하나를
  // 선택(focusCenter 세팅)해도 카메라 위치만 옮겨갈 뿐 줌은 이전 bounds-fit이
  // 남긴 값 그대로 남아 "줌인이 안 된 것"처럼 보이는 문제가 있었음(실측
  // 확인 — 페르소나 전체 진입으로 level 9까지 줌아웃된 뒤 특정 스팟을
  // 클릭해도 center만 옮겨가고 level은 계속 9). 장소 하나를 포커스할 때마다
  // 명시적으로 setLevel(4)를 호출해 항상 확실히 줌인되도록 통일 — 사용자가
  // 장소를 선택하는 이산적 이벤트에서만 1번 실행되는 가벼운 호출.
  // 실측 중 발견: setLevel()만 부르면 <KakaoMap center> prop 변경이 트리거한
  // isPanto 애니메이션이 중간에 끊겨서 줌만 4로 바뀌고 카메라는 그 자리에
  // 멈춰버림(bounds-fit 위치에 남아있음) — panTo도 같이 명시적으로 호출해
  // 두 상태를 한 번에 확정한다(handleRequestLocation과 동일한 방어 패턴).
  useEffect(() => {
    if (!map || !focusCenter || typeof kakao === 'undefined' || !kakao.maps) return
    map.setLevel(4)
    map.panTo(new kakao.maps.LatLng(focusCenter.lat, focusCenter.lng))
  }, [focusCenter, map])

  // 버그 수정 — 지도 컨테이너 크기가 CSS로 바뀔 때(모바일 패널 "전체화면"
  // 전환뿐 아니라, 데스크탑 사이드바 접기/펴기처럼 이 컴포넌트가 전혀 모르는
  // 곳의 상태 변화로도 발생) 카카오 지도는 이걸 스스로 감지하지 못해서 마지막
  // 으로 그려졌던 크기 기준 타일만 남아있다가 빈 공간이 남거나 잘려 보이는
  // 문제가 있었다(대부분의 지도 SDK 공통 특성 — 구글맵의
  // `google.maps.event.trigger(map,'resize')`와 동일한 역할을 카카오는
  // `map.relayout()`이 함). 처음엔 `compact` prop 하나만 감지해서 고쳤는데,
  // 사이드바 접기처럼 이 prop과 무관한 다른 원인으로 같은 증상이 재발함 —
  // 특정 트리거를 일일이 쫓는 대신 컨테이너 자체를 ResizeObserver로 지켜봐서
  // "원인이 뭐든 실제 크기가 바뀌면" 항상 relayout하도록 근본적으로 수정.
  // targetRef는 렌더마다 최신 중심좌표를 담아둬서, 옵저버 콜백(맵 인스턴스가
  // 바뀔 때만 재구독)이 항상 최신 값을 읽게 한다. 렌더 중 직접 대입하는 대신
  // effect에서 커밋 후에 갱신(react-hooks/refs 위반 회피).
  const targetRef = useRef(center)
  useEffect(() => {
    targetRef.current = focusCenter ?? center
  })
  useEffect(() => {
    if (!map || !mapContainerRef.current) return
    const observer = new ResizeObserver(() => {
      map.relayout()
      const target = targetRef.current
      map.setCenter(new kakao.maps.LatLng(target.lat, target.lng))
    })
    observer.observe(mapContainerRef.current)
    return () => observer.disconnect()
  }, [map])

  // "현재 위치" 버튼 전용 — 팀 태스크보드 4번. react-kakao-maps-sdk의 <Map center>는
  // center 값이 실제로 바뀔 때만 카메라를 움직이는데(내부적으로 kakao map의
  // 실제 center와 비교), 지도를 손으로 드래그해도 이 center prop 값 자체는
  // 안 바뀌어서 GPS를 다시 읽어도 좌표가 이전과 같으면 아무 일도 안 일어남
  // (드래그는 카카오 지도 내부 상태만 바꾸고 React는 전혀 모름). 그래서 prop
  // 값 비교에 기대지 않고 버튼 클릭 시 map 인스턴스에 직접 panTo를 호출해
  // 값이 같아도 무조건 원위치로 돌아가게 한다.
  function handleRequestLocation() {
    onRequestLocation()
    setFocusCenter(null)
    setPendingCenter(null)
    if (map && typeof kakao !== 'undefined' && kakao.maps) {
      map.panTo(new kakao.maps.LatLng(center.lat, center.lng))
    }
  }

  // 2026-09 대화 중 요청 — 우측 하단(검정) 버튼 전용. SNS 분석기 등에서
  // 넘어온 focusPlaces 핸드오프와 무관하게 항상 실제 GPS로 강제 이동해야
  // 하므로, MapPage의 onForceCurrentLocation(뷰의 focusPlaces 우선순위 자체를
  // 해제)을 부른다 — 그 외 camera 재동기화 로직은 handleRequestLocation과 동일.
  function handleForceCurrentLocation() {
    onForceCurrentLocation()
    setFocusCenter(null)
    setPendingCenter(null)
    if (map && typeof kakao !== 'undefined' && kakao.maps) {
      map.panTo(new kakao.maps.LatLng(center.lat, center.lng))
    }
  }

  // 팀 태스크보드 5번 — 사용자가 지도를 손으로 드래그해서 놓은 순간의 중심좌표를
  // 기억해둔다(아직 검색 확정 아님, 버튼 노출용). 카카오 지도 내부 드래그는
  // React state를 전혀 거치지 않으므로 dragend 이벤트에서 map.getCenter()로 직접 읽는다.
  function handleDragEnd(target: kakao.maps.Map) {
    const latLng = target.getCenter()
    setPendingCenter({ lat: latLng.getLat(), lng: latLng.getLng() })
  }

  function handleSearchArea() {
    if (!pendingCenter || !onSearchArea) return
    onSearchArea(pendingCenter)
    setPendingCenter(null)
    setFocusCenter(null)
  }

  if (loading || error) {
    return <PercentMapCanvas {...props} />
  }

  const mapCenter = focusCenter ?? center

  return (
    <div ref={mapContainerRef} className={cn('relative h-full w-full overflow-hidden', compact ? 'min-h-0' : 'min-h-70')}>
      <KakaoMap
        center={mapCenter}
        level={4}
        isPanto
        className="h-full w-full"
        onCreate={setMap}
        onDragEnd={onSearchArea ? handleDragEnd : undefined}
      >
        {places.map((place) => {
          const selected = place.id === selectedPlaceId
          // 다중 검색결과(highlightIds)는 그대로 다 빨간 핀 유지. 여기에 더해
          // 검색과 무관하게 그냥 선택된 장소(주변 스팟 리스트 클릭, 지도 핀
          // 직접 클릭 등)도 동일한 빨간 핀으로 보여줘서 "지금 선택된 곳"이 늘
          // 하나의 핀으로 따라다니게 한다(대화로 확정).
          const showSearchPin = highlightIds?.has(place.id) || selected
          const { icon: Icon, pinBg } = getPlaceCategoryMeta(place.category)
          return (
            <CustomOverlayMap
              key={place.id}
              position={{ lat: place.lat, lng: place.lng }}
              clickable
              // 2026-09 대화 중 요청 — TourAPI 스팟이 몰려있는 지역에서 빨간
              // 강조 핀(showSearchPin)이 다른 카테고리 핀에 가려서 안 보이던
              // 문제. 기존엔 selected 여부만 zIndex 2/1로 나눠서, 다중
              // 검색결과 중 "선택 안 된" 빨간 핀들은 일반 핀과 동일한 우선순위였음
              // — showSearchPin이면 무조건 일반 핀보다 위(10), 그중 선택된
              // 것만 최상위(20)로 분리.
              zIndex={showSearchPin ? (selected ? 20 : 10) : 1}
              yAnchor={showSearchPin ? 1 : 0.5}
            >
              <button type="button" onClick={() => onSelectPlace(place)} title={place.name}>
                {showSearchPin ? (
                  <SearchResultPin selected={selected} />
                ) : (
                  <span className={pinClassName(selected, pinBg)}>
                    <Icon className="h-3.75 w-3.75" />
                  </span>
                )}
              </button>
            </CustomOverlayMap>
          )
        })}

        {myLocation && (
          <CustomOverlayMap position={myLocation} zIndex={3}>
            <CurrentLocationPin />
          </CustomOverlayMap>
        )}
      </KakaoMap>

      <LocationOverlay locationLabel={locationLabel} onRequestLocation={handleRequestLocation} isAnalysisResult={isAnalysisResult} />
      <MapActionButtons onForceCurrentLocation={handleForceCurrentLocation} />
      {onSearchArea && pendingCenter && <SearchAreaButton onClick={handleSearchArea} />}
    </div>
  )
}

export function MapCanvas(props: MapCanvasProps) {
  if (!import.meta.env.VITE_KAKAO_MAP_KEY) {
    return <PercentMapCanvas {...props} />
  }
  return <KakaoMapCanvas {...props} />
}
