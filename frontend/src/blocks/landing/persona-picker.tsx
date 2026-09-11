import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
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

  // 카드가 언마운트될 때(예: 정렬이 바뀌어 상위 4개에서 밀려남) 인터벌이 살아
  // 남아 리렌더를 시도하는 걸 방지.
  useEffect(() => stopCycle, [])

  const src = isHovering && images.length > 0 ? images[placeIndex] : persona.profileImg

  return (
    <button
      type="button"
      onClick={() => onSelect(persona)}
      onMouseEnter={startCycle}
      onMouseLeave={stopCycle}
      className="w-40 shrink-0 overflow-hidden rounded-2xl border border-border bg-card text-left transition-all hover:border-primary/60 hover:bg-primary/10 md:w-full md:shrink"
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
        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{persona.description}</p>
      </div>
    </button>
  )
}

interface PersonaPickerProps {
  onSelect: (persona: KContentPersona) => void
}

export function PersonaPicker({ onSelect }: PersonaPickerProps) {
  const { t, i18n } = useTranslation()
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
    <section className="w-full space-y-3">
      <div>
        <h2 className="mt-0.5 flex items-center gap-1.5 text-lg font-bold text-foreground">
          <Sparkles className="h-4.5 w-4.5 text-primary" />
          {t('persona.k_content_title')}
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('persona.k_content_subtitle')}</p>
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
