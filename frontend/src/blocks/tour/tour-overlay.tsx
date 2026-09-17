import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTourStore } from '@/store/tour-store'
import { TOUR_REGISTRY } from './tour-steps'

const SPOTLIGHT_PADDING = 8
const TOOLTIP_HEIGHT_ESTIMATE = 160
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
// 지금은 "다음" 버튼으로만 진행하는 안전한 버전 — 하이라이트된 실제 버튼을
// 눌러도 다음 단계로 넘어가는 인터랙션은 이 프로토타입을 확인한 뒤 추가한다.
export function TourOverlay() {
  const { t } = useTranslation()
  const activeTourKey = useTourStore((s) => s.activeTourKey)
  const stepIndex = useTourStore((s) => s.stepIndex)
  const next = useTourStore((s) => s.next)
  const skip = useTourStore((s) => s.skip)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const steps = activeTourKey ? TOUR_REGISTRY[activeTourKey] : null
  const step = steps?.[stepIndex] ?? null

  useLayoutEffect(() => {
    if (!step) return
    function measure() {
      setRect(findVisibleTarget(step!.target)?.getBoundingClientRect() ?? null)
    }
    measure()
    // 다음 프레임에 한 번 더 재측정 — 페이지 전환 직후 레이아웃이 아직 확정되지
    // 않은 상태에서 첫 측정이 어긋나는 경우를 보정한다.
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step, stepIndex])

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
  const { top: tooltipTop, left: tooltipLeft } = computeTooltipPosition(box, tooltipWidth, TOOLTIP_HEIGHT_ESTIMATE, viewportW, viewportH)

  return createPortal(
    <div className="fixed inset-0 z-200">
      {box ? (
        <div
          className="absolute rounded-2xl border-2 border-primary transition-all duration-300"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height, boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}

      <div
        className="absolute rounded-2xl border border-border bg-background p-4 shadow-2xl transition-all duration-300"
        style={{ top: tooltipTop, left: tooltipLeft, width: tooltipWidth }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground">
            {stepIndex + 1} / {steps.length}
          </span>
          <button type="button" onClick={skip} aria-label={t('tour.skip')} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm font-bold text-foreground">{t(step.titleKey)}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{t(step.bodyKey)}</p>
        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={skip} className="text-xs font-medium text-muted-foreground underline">
            {t('tour.skip')}
          </button>
          <Button size="sm" onClick={() => next(steps.length)}>
            {stepIndex + 1 === steps.length ? t('tour.done') : t('tour.next')}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
