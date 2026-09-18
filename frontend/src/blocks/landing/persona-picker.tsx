import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Sparkles } from 'lucide-react'
import { fetchKContentPersonas, fetchPersonaPlaces, type KContentPersona } from '@/api/personas'
import type { Locale } from '@/i18n'

// Home-screen entry point for the persona feature (2026-09 redesign — this
// replaces the old "근처 인기 K-스팟" HomeFeed section as the headline block).
// Only lists personas and hands the pick off via onSelect; PersonaPage owns
// actually generating the route so this component stays free of navigation
// concerns and is easy to reuse (e.g. inside a modal) later if needed.
//
// Card shape: square photo tile + info below, matching the old HomeFeed
// PlaceCard (blocks/common/place-card.tsx) look the team asked to reuse here,
// laid out in the same mobile-scroll/desktop-grid pattern as HomeFeed.
//
// 2026-09 태스크보드 1번 — 상위 4개만 노출(routeCnt 내림차순, 값이 같으면
// 응답 순서 유지 — Array.prototype.sort는 안정 정렬이라 별도 처리 불필요).
// 호버 시 그 persona가 방문한 실제 장소 사진을 빠르게 순환 노출(슬라이드쇼) —
// 지도 스타별 필터(12번)에서 붙인 fetchPersonaPlaces()를 그대로 재사용해서
// label별로 이미지 목록을 만든다(같은 쿼리 키라 캐시도 공유됨).
const TOP_PERSONA_COUNT = 4
// 처음엔 450ms로 짧게 잡았다가 "이미지별로 속도가 일정하지 않다"는 피드백
// (매 tick마다 새 이미지를 그제서야 네트워크로 불러오느라 로딩 지연이 들쭉날쭉
// 해서 체감 속도가 달라 보였음) → preloadImages()로 미리 브라우저 캐시에
// 올려두고, 간격도 여유 있게 늘려 체감을 균일하게 맞춤(대화로 확정).
const HOVER_CYCLE_MS = 1500

// 모바일엔 호버가 없어서 위 슬라이드쇼를 볼 방법이 없었음(대화 중 요청) — 카드를
// 꾹 누르고 있는 동안만 동일한 슬라이드쇼를 팝업으로 띄운다. 카드 목록이
// 가로 스크롤(overflow-x-auto)이라 "스크롤하려는 스와이프"와 "꾹 누르기"를
// 구분해야 해서, 누른 뒤 이 시간만큼 버티고 그동안 손가락이
// LONG_PRESS_MOVE_THRESHOLD_PX 이상 안 움직였을 때만 롱프레스로 인정한다
// (터치 시작~그 시간 전에 크게 움직이면 타이머를 취소하고 preventDefault 없이
// 그대로 두어 네이티브 스크롤이 정상 진행되게 함).
const LONG_PRESS_MS = 350
const LONG_PRESS_MOVE_THRESHOLD_PX = 10

function preloadImages(urls: string[]) {
  urls.forEach((url) => {
    const img = new Image()
    img.src = url
  })
}

interface PersonaCardProps {
  persona: KContentPersona
  images: string[]
  onSelect: (persona: KContentPersona) => void
}

// 버그 수정 — hover 리스너가 매 tick마다 key로 리마운트되는 <img>의 바로 위
// 부모에 있었더니, 빠르게 마우스를 들락날락하면 그 <img>가 교체되는 순간
// 브라우저가 relatedTarget을 헷갈려 mouseleave를 못 잡거나 잘못 쏘는 경우가
// 있었다("호버아웃 됐는데도 계속 돎"). → hover는 절대 리마운트되지 않는
// 가장 바깥 <button>(카드 전체)에서만 감지하도록 옮김 — 안쪽에서 이미지가
// 몇 번을 교체되든 이 버튼 자체의 경계는 안 바뀌므로 더 안정적이다.
function PersonaCard({ persona, images, onSelect }: PersonaCardProps) {
  const { t } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [placeIndex, setPlaceIndex] = useState(0)
  const intervalRef = useRef<number | null>(null)
  // 모바일 롱프레스 전용 상태 — isHovering/interval은 데스크탑 마우스 호버와
  // 그대로 공유해서 재사용하고(startCycle/stopCycle 그대로 호출), 이 값은
  // 오직 "전체화면 85% 팝업을 보여줄지"만 따로 제어한다(데스크탑 마우스
  // 호버에서는 이 값이 절대 true가 안 되므로 팝업이 뜨지 않음).
  const [isLongPressing, setIsLongPressing] = useState(false)
  const pressStartRef = useRef<{ x: number; y: number } | null>(null)
  const pressTimerRef = useRef<number | null>(null)
  // 롱프레스 릴리즈 직후 브라우저가 합성해서 쏘는 click을 막기 위한 가드 —
  // pointerup에서 preventDefault만으로도 대부분 막히지만 크로스브라우저
  // 안전판으로 하나 더 둔다(순수 탭일 땐 절대 true가 안 되므로 기존 탭-선택
  // 동작에는 영향 없음).
  const suppressClickRef = useRef(false)

  // 호버하기 전에 미리 로드해둬야 첫 전환부터 지연 없이 균일한 속도로 바뀐다.
  useEffect(() => {
    preloadImages(images)
  }, [images])

  // 기본 화면은 항상 persona.profileImg — 호버 중일 때만 장소 사진으로 순환,
  // 호버를 떼면 다시 profileImg로 복귀(대화로 확정).
  function startCycle() {
    if (images.length === 0) return
    setIsHovering(true)
    setPlaceIndex(0)
    if (intervalRef.current !== null) return
    intervalRef.current = window.setInterval(() => {
      setPlaceIndex((i) => (i + 1) % images.length)
    }, HOVER_CYCLE_MS)
  }

  function stopCycle() {
    setIsHovering(false)
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  function clearPressTimer() {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  // Pointer Events + setPointerCapture 사용 — spot-list-panel.tsx의 모바일
  // 스와이프 핸들과 동일한 이유(CLAUDE.md Step 7 후속 기록): 순수 Touch
  // 이벤트만 쓰면 실기기에서 "손을 뗐는데 release가 이 엘리먼트로 안 옴"(터치
  // 시작 지점과 실제 종료 이벤트가 다른 곳으로 새는 현상 — 처음엔
  // onTouchEnd/onTouchCancel만으로 구현했다가 실기기 테스트에서 롱프레스
  // 팝업이 손을 떼도 안 닫히는 버그로 재현됨) 문제가 실제로 있었다.
  // setPointerCapture(e.pointerId)를 해두면 이후 이 포인터의 move/up/cancel이
  // 브라우저 스펙상 무조건 이 엘리먼트로만 오게 강제되어 안전하다.
  // pointerType으로 마우스는 걸러서 데스크탑 클릭/호버 동작에는 전혀 관여하지 않는다.
  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.pointerType !== 'touch' || images.length === 0) return
    pressStartRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
    pressTimerRef.current = window.setTimeout(() => {
      pressTimerRef.current = null
      startCycle()
      setIsLongPressing(true)
    }, LONG_PRESS_MS)
  }

  // 타이머가 아직 안 끝났는데 손가락이 많이 움직이면 스크롤 의도로 보고
  // 타이머만 취소한다(preventDefault를 안 불러서 네이티브 가로 스크롤은
  // 그대로 진행됨). 이미 롱프레스가 활성화된 뒤의 움직임은 무시 — "손가락을
  // 뗄 때"만 닫히면 된다는 요구사항 그대로.
  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (pressTimerRef.current === null || !pressStartRef.current) return
    const dx = e.clientX - pressStartRef.current.x
    const dy = e.clientY - pressStartRef.current.y
    if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_THRESHOLD_PX) clearPressTimer()
  }

  function endLongPress(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.pointerType !== 'touch') return
    pressStartRef.current = null
    if (pressTimerRef.current !== null) {
      // 롱프레스로 인정되기 전에 손을 뗌 = 짧은 탭 → 아무것도 안 하고 기존
      // onClick(선택)이 그대로 통과하게 둔다.
      clearPressTimer()
      return
    }
    if (isLongPressing) {
      e.preventDefault()
      suppressClickRef.current = true
      stopCycle()
      setIsLongPressing(false)
    }
  }

  function handleCardClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onSelect(persona)
  }

  // 카드가 언마운트될 때(예: 정렬이 바뀌어 상위 4개에서 밀려남) 인터벌/타이머가
  // 살아남아 리렌더를 시도하는 걸 방지.
  useEffect(() => {
    return () => {
      stopCycle()
      clearPressTimer()
    }
  }, [])

  const src = isHovering && images.length > 0 ? images[placeIndex] : persona.profileImg

  return (
    <>
      <button
        type="button"
        onClick={handleCardClick}
        onMouseEnter={startCycle}
        onMouseLeave={stopCycle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endLongPress}
        onPointerCancel={endLongPress}
        onContextMenu={(e) => e.preventDefault()}
        className="w-40 shrink-0 select-none overflow-hidden rounded-2xl border border-border bg-card text-left transition-all hover:border-primary/60 hover:bg-primary/10 md:w-full md:shrink"
      >
        <div className="aspect-square w-full overflow-hidden bg-muted">
          {src && !imageFailed ? (
            // key를 바꿔 매 전환마다 새로 마운트 → 오른쪽에서 슬라이드해 들어오는
            // CSS 애니메이션(index.css의 .animate-persona-slide)이 다시 재생됨.
            // 이 <img>가 통째로 바뀌어도 위 hover 리스너는 바깥 버튼에 있어서 안전.
            <img
              key={isHovering ? placeIndex : 'default'}
              src={src}
              alt={`${persona.label} profile`}
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover animate-persona-slide"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/15 text-2xl font-bold text-primary">
              {persona.badge}
            </div>
          )}
        </div>
        <div className="space-y-1 p-3">
          <p className="truncate font-semibold text-foreground">{persona.label}</p>
          <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {persona.routeCnt}
            {t('persona.stops_suffix')}
          </span>
          <p className="truncate text-[10px] font-medium text-primary">
            {persona.moods.map((mood) => `#${mood}`).join(' ')}
          </p>
          <p className="line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">{persona.description}</p>
        </div>
      </button>

      {/* 모바일 롱프레스 전용 팝업 — 화면 전체의 85%(가장자리 여백 7.5%)에
          이미지를 확대 표시. document.body에 포탈로 그려서 카드의
          overflow-x-auto/overflow-hidden 조상에 잘리지 않게 한다. setPointerCapture로
          release 감지가 카드 버튼에 고정되어 있어(위 handlePointerDown 참고),
          이 오버레이 자체는 pointer-events-none으로 완전히 비활성화해도 무방하다. */}
      {isLongPressing &&
        images.length > 0 &&
        createPortal(
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-100 flex items-center justify-center bg-black/70"
          >
            <div className="h-[85vh] w-[85vw] overflow-hidden rounded-3xl shadow-2xl">
              <img
                key={placeIndex}
                src={images[placeIndex]}
                alt={`${persona.label} preview`}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover animate-persona-slide"
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

interface PersonaPickerProps {
  onSelect: (persona: KContentPersona) => void
}

export function PersonaPicker({ onSelect }: PersonaPickerProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const locale = i18n.language as Locale

  const personasQuery = useQuery({
    queryKey: ['k-content-personas', locale],
    queryFn: () => fetchKContentPersonas(locale),
  })
  const placesQuery = useQuery({
    queryKey: ['persona-places', locale],
    queryFn: () => fetchPersonaPlaces(locale),
    staleTime: 30 * 60 * 1000,
  })

  const imagesByLabel = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const place of placesQuery.data ?? []) {
      if (!place.imageUrl) continue
      for (const tag of place.tags ?? []) {
        map.set(tag, [...(map.get(tag) ?? []), place.imageUrl])
      }
    }
    return map
  }, [placesQuery.data])

  const topPersonas = useMemo(
    () => [...(personasQuery.data ?? [])].sort((a, b) => b.routeCnt - a.routeCnt).slice(0, TOP_PERSONA_COUNT),
    [personasQuery.data],
  )

  return (
    <section data-tour="home-persona" className="w-full space-y-3">
      <div>
        <h2 className="mt-0.5 flex items-center gap-1.5 text-lg font-bold text-foreground">
          <Sparkles className="h-4.5 w-4.5 text-primary" />
          {t('persona.k_content_title')}
        </h2>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-xs leading-5 text-muted-foreground">{t('persona.k_content_subtitle')}</p>
          <button
            type="button"
            onClick={() => navigate('persona')}
            className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
          >
            {t('persona.view_more')}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 scrollbar-hide scroll-fade-x md:mx-0 md:mask-none md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {personasQuery.isPending &&
          Array.from({ length: TOP_PERSONA_COUNT }).map((_, index) => (
            <div
              key={index}
              className="w-40 shrink-0 animate-pulse overflow-hidden rounded-2xl border border-border bg-muted md:w-full md:shrink"
            >
              <div className="aspect-square w-full bg-muted" />
            </div>
          ))}

        {!personasQuery.isPending &&
          topPersonas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              images={imagesByLabel.get(persona.label) ?? []}
              onSelect={onSelect}
            />
          ))}
      </div>
    </section>
  )
}
