import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { RoutePlan } from '@/lib/route-timing'

interface DocentPlayerProps {
  open: boolean
  onClose: () => void
  plan: RoutePlan
}

export function DocentPlayer({ open, onClose, plan }: DocentPlayerProps) {
  const [trackIndex, setTrackIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset when dialog opens — "adjusting state during render" pattern avoids
  // the react-hooks/set-state-in-effect lint rule that fires for sync setState
  // inside a useEffect body. React applies these before the first commit.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setTrackIndex(0)
      setPlaying(false)
      setProgress(0)
    }
  }

  // Auto-advance track when progress completes — same pattern.
  const [prevProgress, setPrevProgress] = useState(progress)
  if (prevProgress !== progress) {
    setPrevProgress(progress)
    if (progress >= 100) {
      const next = trackIndex + 1
      if (next < plan.stops.length) {
        setTrackIndex(next)
        setProgress(0)
      } else {
        setPlaying(false)
      }
    }
  }

  // setInterval is a genuine external system, so useEffect is the right place.
  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + 1))
    }, 300)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playing])

  function goTo(index: number) {
    setTrackIndex(index)
    setProgress(0)
  }

  const stop = plan.stops[trackIndex]
  if (!stop) return null

  const elapsed = Math.round((progress / 100) * (stop.stayMinutes ?? 60))
  const total = stop.stayMinutes ?? 60

  function fmtMin(m: number) {
    return `${Math.floor(m)}:${String(Math.round((m % 1) * 60)).padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-sm">
        <div className="bg-primary/10 px-6 pb-6 pt-5">
          <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-primary">
            Audio Guide
          </p>
          <h3 className="mt-0.5 text-center text-xs font-semibold text-muted-foreground">{plan.title}</h3>

          <div className="mt-5 flex justify-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary/20 text-3xl font-black text-primary">
              {trackIndex + 1}
            </div>
          </div>

          <div className="mt-5 text-center">
            <p className="text-base font-bold text-foreground">{stop.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{stop.address}</p>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{fmtMin(elapsed)}</span>
              <span>{fmtMin(total)}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-6">
            <button
              type="button"
              disabled={trackIndex === 0}
              onClick={() => goTo(trackIndex - 1)}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-opacity hover:opacity-90"
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
            </button>

            <button
              type="button"
              disabled={trackIndex === plan.stops.length - 1}
              onClick={() => goTo(trackIndex + 1)}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-36 overflow-y-auto px-4 py-3">
          {plan.stops.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-accent',
                i === trackIndex && 'bg-accent',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  i === trackIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  'min-w-0 truncate text-xs font-semibold',
                  i === trackIndex ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {s.name}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
