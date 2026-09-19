import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ArrowDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTourStore } from '@/store/tour-store'
import { TOUR_REGISTRY } from './tour-steps'

const SPOTLIGHT_PADDING = 8
// 실제 높이는 렌더 후 측정해서 쓰고(아래 tooltipRef), 이 값은 첫 프레임 추정치 —
// 글씨를 키운 뒤 실측 범위(약 164~186px)에 맞춰 갱신.
const TOOLTIP_HEIGHT_ESTIMATE = 176
const TOOLTIP_MAX_WIDTH = 384
const TOOLTIP_GAP = 12
const VIEWPORT_MARGIN = 16

function findVisibleTarget(name: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)
  for (const el of candidates) {
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return el
  }
  return null
}

interface Box {
  top: number
  left: number
  width: number
  height: number
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max))
}

// 사이드바 전체처럼 세로로 긴 박스는 위/아래 어느 쪽에도 여백이 없어서
// 말풍선이 하이라이트 자체와 겹쳐버린다(사용자 피드백: "말풍선이 메뉴를
// 가려서 안 보여") — 아래→위→오른쪽→왼쪽 순서로 실제로 들어갈 공간이 있는
// 방향을 찾고, 그마저 없으면 화면 안쪽으로 clamp한 "아래"를 최후 수단으로 쓴다.
function computeTooltipPosition(box: Box | null, tooltipW: number, tooltipH: number, viewportW: number, viewportH: number) {
  if (!box) {
    return { top: viewportH / 2 - tooltipH / 2, left: (viewportW - tooltipW) / 2 }
  }

  const horizontalCenter = clamp(box.left + box.width / 2 - tooltipW / 2, VIEWPORT_MARGIN, viewportW - VIEWPORT_MARGIN - tooltipW)
  const verticalCenter = clamp(box.top + box.height / 2 - tooltipH / 2, VIEWPORT_MARGIN, viewportH - VIEWPORT_MARGIN - tooltipH)

  const spaceBelow = viewportH - (box.top + box.height) - TOOLTIP_GAP
  const spaceAbove = box.top - TOOLTIP_GAP
  const spaceRight = viewportW - (box.left + box.width) - TOOLTIP_GAP
  const spaceLeft = box.left - TOOLTIP_GAP

  if (spaceBelow >= tooltipH) return { top: box.top + box.height + TOOLTIP_GAP, left: horizontalCenter }
  if (spaceAbove >= tooltipH) return { top: box.top - TOOLTIP_GAP - tooltipH, left: horizontalCenter }
  if (spaceRight >= tooltipW) return { top: verticalCenter, left: box.left + box.width + TOOLTIP_GAP }
  if (spaceLeft >= tooltipW) return { top: verticalCenter, left: box.left - TOOLTIP_GAP - tooltipW }

  return {
    top: clamp(box.top + box.height + TOOLTIP_GAP, VIEWPORT_MARGIN, viewportH - VIEWPORT_MARGIN - tooltipH),
    left: horizontalCenter,
  }
}

// 코치마크 오버레이 — 실제 화면 요소를 어둡게 가려진 배경 위에서 하이라이트하고
// 옆에 말풍선으로 설명한다(정적 텍스트 팝업이던 기존 도움말과 다른 점).
// 기본은 "다음" 버튼으로만 진행하는 안전한 방식이고, clickThrough가 켜진
// 단계(예: 페르소나 카드 선택)에서는 하이라이트된 실제 버튼을 눌러도 그
// 자리에서 바로 다음 단계로 넘어간다(사용자 요청).
export function TourOverlay() {
  const { t } = useTranslation()
  const activeTourKey = useTourStore((s) => s.activeTourKey)
  const stepIndex = useTourStore((s) => s.stepIndex)
  const next = useTourStore((s) => s.next)
  const close = useTourStore((s) => s.close)
  const optOut = useTourStore((s) => s.optOut)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [tooltipHeight, setTooltipHeight] = useState(TOOLTIP_HEIGHT_ESTIMATE)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  const steps = activeTourKey ? TOUR_REGISTRY[activeTourKey] : null
  const step = steps?.[stepIndex] ?? null

  // sonner 토스트가 자체 CSS로 z-index를 최상단 고정해둬서(index.css의
  // body[data-tour-active] 규칙 참고), 투어와 무관한 알림이 어둡게 깔린
  // 배경 위에 그대로 떠 튜토리얼 내용처럼 도드라져 보였다(사용자 피드백).
  // 투어가 떠 있는 동안만 body에 표시를 남겨서 토스트도 같이 어두워지게
  // 하고, 투어가 끝나면 바로 원래대로 되돌린다.
  useEffect(() => {
    if (!step) return
    document.body.setAttribute('data-tour-active', '')
    return () => {
      document.body.removeAttribute('data-tour-active')
    }
  }, [step])

  useLayoutEffect(() => {
    if (!step) return

    // clickThrough 단계는 하이라이트된 실제 요소 안의 버튼/링크를 누르면 그
    // 클릭이 페이지에도 그대로 전달되면서(아래 하이라이트 박스의
    // pointer-events-none) 동시에 투어도 다음 단계로 넘어간다 — 빈 여백
    // 클릭까지 진행으로 치지 않도록 실제 버튼/링크 안에서 난 클릭만 인정한다.
    let attachedTarget: HTMLElement | null = null
    let hasScrolledIntoView = false
    // 이 스텝에서 마지막으로 "정상"으로 받아들인 측정값 — 스텝이 바뀌면
    // 이펙트 전체가 다시 실행되면서 자동으로 초기화되므로, 다른 스텝의
    // 타겟과 잘못 비교될 일은 없다.
    let lastGoodRect: DOMRect | null = null
    // hintEffect가 있는 단계는 실제 타겟 DOM에 반복 애니메이션 클래스를
    // 직접 건다("눌러야 할지 애매하다"/"드래그 방향을 모르겠다" 피드백
    // 대응). 클린업에서 반드시 떼어내야 해서 어떤 요소에 붙였는지 기억한다.
    let animatedTarget: HTMLElement | null = null
    const hintClass = step!.hintEffect === 'pulse' ? 'animate-card-pulse' : step!.hintEffect === 'drag-bob' ? 'animate-drag-bob' : null
    function handleRealClick(event: MouseEvent) {
      if (event.target instanceof Element && event.target.closest('button, a')) next(steps!.length)
    }

    function measure() {
      const target = findVisibleTarget(step!.target)
      // 타겟이 화면 밖(스크롤 아래)에 있으면 좌표 계산이 전부 어긋나므로
      // (예: 결과 화면 맨 아래 "루트에 추가" 버튼), 새로 찾은 첫 순간에 한
      // 번만 화면 안으로 스크롤한다 — 매 측정마다 하면 사용자가 직접
      // 스크롤 중일 때 자꾸 되돌아가서 방해된다.
      if (target && !hasScrolledIntoView) {
        target.scrollIntoView({ block: 'center' })
        hasScrolledIntoView = true
      }
      const nextRect = target?.getBoundingClientRect() ?? null
      // 드물게 레이아웃이 아직 자리잡지 않은 프레임(예: 리렌더 직후 폰트/
      // 자식 요소가 아직 확정되기 전)에서 실제 요소보다 훨씬 좁은 rect가
      // 잠깐 잡히는 경우가 있었다(사용자 피드백: 하이라이트가 실제 요소
      // 테두리보다 좁게 잘려서 안 맞아 보임 — 안의 텍스트가 그 좁은 구멍
      // 사이로 한 글자씩만 보이는 정도로 심하게 어긋난 사례도 있었음). 같은
      // 스텝 안에서 직전 정상 측정치보다 폭이 60% 넘게 줄어들면 이번 측정은
      // 버리고 다음 200ms 폴링에서 다시 잡는다 — 최악의 경우도 한 프레임
      // 정도만 갱신이 늦어질 뿐이라 체감상 티가 안 난다.
      if (lastGoodRect && nextRect && nextRect.width < lastGoodRect.width * 0.4) {
        // skip — keep showing the last good rect until the next poll
      } else {
        lastGoodRect = nextRect
        setRect(nextRect)
      }
      // 말풍선 실제 높이를 측정해서 below/above 판단에 쓴다 — 고정 추정치
      // (TOOLTIP_HEIGHT_ESTIMATE)만 쓰면 내용이 짧은 단계에서도 여백이 부족한
      // 것처럼 계산돼 불필요하게 "위쪽"으로 밀려나는 경우가 있었다(사용자
      // 피드백: 지도 투어 말풍선이 아래쪽에 있으면 좋겠다).
      if (tooltipRef.current) setTooltipHeight(tooltipRef.current.offsetHeight)
      // advanceOnClick이 명시적으로 false인 단계(예: 드래그로 완료 신호를
      // 직접 보내는 단계)는 클릭 리스너를 안 붙인다 — pointer-events는 여전히
      // 실제 요소로 전달돼서 드래그 자체는 그대로 동작한다.
      if (step!.clickThrough && step!.advanceOnClick !== false && target && target !== attachedTarget) {
        attachedTarget?.removeEventListener('click', handleRealClick)
        target.addEventListener('click', handleRealClick)
        attachedTarget = target
      }
      if (hintClass && target !== animatedTarget) {
        animatedTarget?.classList.remove(hintClass)
        target?.classList.add(hintClass)
        animatedTarget = target
      }
    }

    measure()
    // 다음 프레임에 한 번 더 재측정 — 페이지 전환 직후 레이아웃이 아직 확정되지
    // 않은 상태에서 첫 측정이 어긋나는 경우를 보정한다.
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    // 타겟이 비동기로 나중에 나타나는 경우(예: 페르소나 카드 선택 후 결과
    // 화면이 로딩되고 나서야 실제 버튼이 생기는 경우)를 대비한 짧은 폴링 —
    // resize/scroll 이벤트만으로는 새로 나타난 요소를 감지할 수 없다.
    const poll = window.setInterval(measure, 200)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      window.clearInterval(poll)
      attachedTarget?.removeEventListener('click', handleRealClick)
      if (hintClass) animatedTarget?.classList.remove(hintClass)
    }
  }, [step, stepIndex, steps, next])

  if (!step || !steps) return null

  const box = rect
    ? {
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
      }
    : null

  const viewportH = window.innerHeight
  const viewportW = window.innerWidth
  const tooltipWidth = Math.min(TOOLTIP_MAX_WIDTH, viewportW - VIEWPORT_MARGIN * 2)
  const { top: tooltipTop, left: tooltipLeft } = computeTooltipPosition(box, tooltipWidth, tooltipHeight, viewportW, viewportH)

  // clickThrough 단계는 바깥 전체를 pointer-events-none으로 풀어서 하이라이트
  // 박스/어둡게 처리된 배경이 클릭을 가로채지 않게 한다 — 말풍선만은
  // 명시적으로 다시 pointer-events-auto를 줘서 그 안 버튼은 그대로 눌린다
  // (pointer-events는 상속되는 속성이라 부모에서 꺼지면 자식도 같이 꺼짐).
  return createPortal(
    <div className={cn('fixed inset-0 z-200', step.clickThrough && 'pointer-events-none')}>
      {box ? (
        <div
          className="absolute rounded-2xl border-2 border-primary transition-all duration-300"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height, boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}

      {/* 드래그 손잡이를 "어떻게" 드래그해야 하는지 모르겠다는 피드백 대응
          (사용자 요청) — 손잡이 옆에 까딱이는 아래 화살표를 보여줘서 드래그
          방향을 알려준다. 위아래 양방향 화살표(ChevronsUpDown)는 헷갈린다는
          피드백으로 아래 방향 화살표 하나로 단순화했다(사용자 요청). 이 투어
          단계에서만 보이고 실제 편집 화면에는 영향 없다. 말풍선이 놓인
          반대쪽(아래에 말풍선이 있으면 위, 아니면 아래)에 둬서 서로 겹치지
          않게 한다. */}
      {box && step.dragHint && (
        <ArrowDown
          className="pointer-events-none absolute h-5 w-5 animate-bounce text-primary"
          style={{
            top: tooltipTop >= box.top + box.height - 4 ? box.top - 24 : box.top + box.height + 4,
            left: box.left + box.width / 2 - 10,
          }}
        />
      )}

      <div
        ref={tooltipRef}
        className="pointer-events-auto absolute rounded-2xl border border-border bg-background p-4 shadow-2xl transition-all duration-300"
        style={{ top: tooltipTop, left: tooltipLeft, width: tooltipWidth }}
      >
        {/* 2026-09 사용자 요청 — 팝업 글씨가 작다는 의견으로 키웠다: 본문 12->14px,
            제목 14->16px, 단계 번호 11->12px, "다시 보지 않기" 12->13px, 닫기(X)
            아이콘 16->20px(누르는 영역도 함께 키움), "다음" 버튼 높이 28->40px
            (모바일 터치 영역). 전부 rem 기반(text-sm/base)이라 브라우저/OS 글자
            크기 설정에도 그대로 따라간다. */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">
            {stepIndex + 1} / {steps.length}
          </span>
          <button type="button" onClick={close} aria-label={t('tour.close')} className="-m-1 p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-base font-bold text-foreground">{t(step.titleKey)}</p>
        <p className="mt-1 text-sm leading-[22px] text-muted-foreground">{t(step.bodyKey)}</p>
        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={optOut} className="text-[13px] font-medium text-muted-foreground underline">
            {t('tour.skip')}
          </button>
          <Button size="sm" className="h-10 px-5 text-sm" onClick={() => next(steps.length)}>
            {stepIndex + 1 === steps.length ? t('tour.done') : t('tour.next')}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
