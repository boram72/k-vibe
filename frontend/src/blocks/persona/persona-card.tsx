import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type KContentPersona } from '@/api/personas'
import { cn } from '@/lib/utils'

// 홈(persona-picker.tsx)과 페르소나 메뉴(PersonaPage.tsx)가 각자 따로 들고
// 있던 카드를 하나로 합침(대화로 요청) — 배치(가로스크롤/그리드, 몇 개를
// 보여줄지)는 호출하는 페이지가 결정하고, 이 카드 자체(이미지+호버
// 슬라이드쇼+이름/뱃지/무드태그/설명)는 완전히 동일하게 공유한다. 예전엔
// 페르소나 메뉴 쪽엔 이미지 클릭 시 확대 팝업(ZoomableImage)이 따로 있었는데,
// 그 기능이 "카드 전체는 선택, 사진만 확대"라는 이중 동작 때문에 버그를 두 번
// 만들어서(plan.md 참고) 이번에 완전히 제거 — 이제 카드 어디를 눌러도 항상
// "선택" 하나로 통일된다. 모바일 롱프레스 슬라이드쇼(예전엔 홈에만 있었음)도
// 같이 제거 — 호버(마우스)만 남긴다.
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
  // 크기/배치(가로스크롤용 고정폭 vs 그리드 채움)는 호출하는 페이지가 결정 —
  // 카드 자체엔 폭 관련 클래스를 하드코딩하지 않는다(대화로 확정한 원칙).
  className?: string
  dataTour?: string
}

export function PersonaCard({ persona, images, onSelect, className, dataTour }: PersonaCardProps) {
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

  // 카드가 언마운트될 때(예: 정렬이 바뀌어 목록에서 밀려남) 인터벌이 살아남아
  // 리렌더를 시도하는 걸 방지.
  useEffect(() => {
    return () => stopCycle()
  }, [])

  const src = isHovering && images.length > 0 ? images[placeIndex] : persona.profileImg

  return (
    <button
      type="button"
      data-tour={dataTour}
      onClick={() => onSelect(persona)}
      onMouseEnter={startCycle}
      onMouseLeave={stopCycle}
      className={cn(
        'select-none overflow-hidden rounded-2xl border border-border bg-card text-left transition-all hover:border-primary/60 hover:bg-primary/10',
        className,
      )}
    >
      <div className="aspect-square w-full overflow-hidden bg-muted">
        {src && !imageFailed ? (
          // key를 바꿔 매 전환마다 새로 마운트 → 오른쪽에서 슬라이드해 들어오는
          // CSS 애니메이션(index.css의 .animate-persona-slide)이 다시 재생됨.
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
        <div className="flex items-center gap-1.5">
          <p className="truncate font-semibold text-foreground">{persona.label}</p>
          <span className="inline-block shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {persona.routeCnt}
            {t('persona.stops_suffix')}
          </span>
        </div>
        <p className="truncate text-[10px] font-medium text-primary">
          {persona.moods.map((mood) => `#${mood}`).join(' ')}
        </p>
        <p className="line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">{persona.description}</p>
      </div>
    </button>
  )
}
