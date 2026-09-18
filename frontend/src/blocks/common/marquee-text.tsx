import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface MarqueeTextProps {
  text: string
  className?: string
}

// 페르소나 카드 설명(persona-picker.tsx/PersonaPage.tsx)이 카드 폭을 넘어갈 때
// line-clamp로 자르는 대신 가로로 흘러가며 전체 텍스트를 보여준다. 1줄 고정이라
// 텍스트 길이와 무관하게 항상 같은 높이를 차지해서, 예전에 line-clamp-2+min-h로
// 억지로 맞추던 카드 높이 정렬 문제도 같이 해결된다(2026-09 태스크보드 7번).
export function MarqueeText({ text, className }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useLayoutEffect(() => {
    const container = containerRef.current
    const textEl = textRef.current
    if (!container || !textEl) return

    function checkOverflow() {
      if (!container || !textEl) return
      setIsOverflowing(textEl.scrollWidth > container.clientWidth)
    }
    checkOverflow()

    const observer = new ResizeObserver(checkOverflow)
    observer.observe(container)
    return () => observer.disconnect()
  }, [text])

  return (
    <div ref={containerRef} className={cn('overflow-hidden whitespace-nowrap', className)}>
      <div className={cn('inline-flex w-max', isOverflowing && 'animate-marquee')}>
        <span ref={textRef} className={isOverflowing ? 'pr-10' : undefined}>
          {text}
        </span>
        {/* 끊김 없이 반복되도록 텍스트를 한 번 더 그려서 -50% 지점에서 이어붙임
            — 오버플로우 안 할 땐 렌더링할 필요 없음(측정용 원본만 표시). */}
        {isOverflowing && (
          <span className="pr-10" aria-hidden="true">
            {text}
          </span>
        )}
      </div>
    </div>
  )
}
