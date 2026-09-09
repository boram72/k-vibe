import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ZoomableImageProps {
  src: string
  alt: string
  className?: string
  referrerPolicy?: 'no-referrer'
  onError?: () => void
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
export function ZoomableImage({ src, alt, className, referrerPolicy, onError }: ZoomableImageProps) {
  const [open, setOpen] = useState(false)

  function handleOpen(event: MouseEvent) {
    event.stopPropagation()
    setOpen(true)
  }

  function handleKeyDown(event: KeyboardEvent) {
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
        className="inline-block shrink-0 cursor-zoom-in"
      >
        <img
          src={src}
          alt={alt}
          referrerPolicy={referrerPolicy}
          onError={onError}
          className={cn(className, 'pointer-events-none')}
        />
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[min(90vw,24rem)] border-none bg-transparent p-0 shadow-none sm:max-w-sm"
          onClick={(event) => event.stopPropagation()}
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <img
            src={src}
            alt={alt}
            referrerPolicy={referrerPolicy}
            className="h-auto w-full rounded-2xl object-cover"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
