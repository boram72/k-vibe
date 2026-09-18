import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ZoomableImageProps {
  src: string
  alt: string
  className?: string
  referrerPolicy?: 'no-referrer'
  onError?: () => void
  // 부모 칸을 꽉 채워야 할 때(예: aspect-square 카드) true — 기본 inline-block
  // 래퍼는 콘텐츠 크기에 맞춰 줄어들어서, 정의된 높이/너비가 없는 span 위에서는
  // <img>의 h-full/w-full 같은 퍼센트 클래스가 안 먹힘. 고정 px 크기(h-16 w-16
  // 등)를 쓰는 기존 호출부는 이 문제가 없어서(퍼센트가 아니라 절대값) 기본값
  // false로 유지 — 그 호출부들의 flex 레이아웃까지 건드리지 않기 위함.
  fill?: boolean
  // true면 이 이미지를 눌러도 확대 팝업을 안 띄우고 클릭을 그대로 부모(카드
  // 버튼)로 흘려보낸다 — 페르소나 투어 1단계에서 카드 사진(가장 크고 누르기
  // 쉬운 영역)을 눌렀을 때 확대 팝업 대신 실제 "선택" 동작이 일어나야
  // 한다는 사용자 피드백 대응. 투어가 이 카드를 가리키는 동안만 켠다.
  disableZoom?: boolean
}

// Avatar/character thumbnails across the app (48px persona picker, 40px persona
// list, 64px persona-route stop image) are too small to make out clearly.
// Wrapping the <img> here lets a tap/click reopen the same image full-size in a
// centered Dialog — works identically on mobile touch and desktop click (no
// hover-only affordance, since touch devices have no hover).
//
// These thumbnails usually sit inside an already-clickable parent (a card
// `<button>` that selects the persona), so the trigger here is a
// `<span role="button">`, never a nested `<button>` — invalid HTML and it
// would also fight the parent's own click handling. stopPropagation keeps a
// click on the image from also triggering the parent card's onClick.
export function ZoomableImage({ src, alt, className, referrerPolicy, onError, fill = false, disableZoom = false }: ZoomableImageProps) {
  const [open, setOpen] = useState(false)

  function handleOpen(event: MouseEvent) {
    if (disableZoom) return // 클릭을 막지 않고 그대로 부모 카드로 흘려보낸다
    event.stopPropagation()
    setOpen(true)
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (disableZoom) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    event.stopPropagation()
    setOpen(true)
  }

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        aria-label={alt}
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        className={cn(fill ? 'block h-full w-full' : 'inline-block shrink-0', !disableZoom && 'cursor-zoom-in')}
      >
        <img
          src={src}
          alt={alt}
          referrerPolicy={referrerPolicy}
          onError={onError}
          className={cn(className, 'pointer-events-none')}
        />
      </span>
      {/* 버그 수정 — DialogContent에만 stopPropagation을 걸어뒀더니, 확대
          이미지 "바깥"(DialogOverlay/배경)을 눌러 닫을 때는 안 걸려서 그
          클릭이 React 트리를 타고 부모 카드의 onClick(선택)까지 그대로
          전파됐음(base-ui Dialog의 Overlay/Popup은 DOM상으로는
          document.body에 포탈되지만, React 합성 이벤트는 실제 DOM이 아니라
          JSX 트리를 따라 버블링하기 때문 — 포탈의 흔한 함정). Dialog 전체를
          감싸는 wrapper에 stopPropagation을 걸어서 Overlay/Popup 클릭 전부를
          여기서 막는다. */}
      <div onClick={(event) => event.stopPropagation()}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-[min(90vw,24rem)] border-none bg-transparent p-0 shadow-none sm:max-w-sm">
            <DialogTitle className="sr-only">{alt}</DialogTitle>
            <img
              src={src}
              alt={alt}
              referrerPolicy={referrerPolicy}
              className="h-auto w-full rounded-2xl object-cover"
            />
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
