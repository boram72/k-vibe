import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import spot1 from '@/assets/analysis-spotlight/spot-1.jpg'
import spot2 from '@/assets/analysis-spotlight/spot-2.jpg'
import spot3 from '@/assets/analysis-spotlight/spot-3.jpg'
import spot4 from '@/assets/analysis-spotlight/spot-4.jpg'
import spot5 from '@/assets/analysis-spotlight/spot-5.jpg'
import spot6 from '@/assets/analysis-spotlight/spot-6.jpg'
import spot7 from '@/assets/analysis-spotlight/spot-7.jpg'
import spot8 from '@/assets/analysis-spotlight/spot-8.jpg'

// Standalone full-screen loading takeover for the SNS analyzer's real
// worst-case wait (~1 minute, Gemini video analysis + Render cold start —
// see analyze.ts's 90s timeout comment). Not wired into AnalyzePage yet —
// this file exists on its own; a caller mounts it conditionally
// (e.g. `{isAnalyzing && <AnalysisLoadingSpotlight />}`) when ready.
//
// Design goals (vs the existing inline `AnalysisLoading` checklist): grab
// attention and avoid boredom over a full minute, no skeleton look. Achieved
// with three things running independently: a spinning dual-ring with
// cross-fading sample spot photos inside (not square-cropped source images —
// `object-cover` center-crops them into the circle), a percentage counter
// that eases toward (but never reaches) a cap so it always looks like it's
// making progress, and a rotating cycle of playful status lines so the
// screen keeps changing.

const SPOT_PHOTOS = [spot1, spot2, spot3, spot4, spot5, spot6, spot7, spot8]
const PHOTO_INTERVAL_MS = 1800
const CAPTION_INTERVAL_MS = 2600
const ELAPSED_TICK_MS = 200

// Asymptotic progress: climbs fast at first, then eases off and approaches
// PROGRESS_CAP without ever hitting it — the parent unmounts this component
// once the real request resolves, so "100%" never needs to happen here.
const PROGRESS_CAP = 92
const PROGRESS_HALF_LIFE_MS = 18000

function useElapsedMs(): number {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const timer = window.setInterval(() => setElapsed(Date.now() - start), ELAPSED_TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  return elapsed
}

function useCyclingIndex(length: number, intervalMs: number): number {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % length), intervalMs)
    return () => window.clearInterval(timer)
  }, [length, intervalMs])

  return index
}

export function AnalysisLoadingSpotlight() {
  const { t } = useTranslation()
  const captions = t('analyze.spotlight_captions', { returnObjects: true }) as string[]

  const elapsedMs = useElapsedMs()
  const photoIndex = useCyclingIndex(SPOT_PHOTOS.length, PHOTO_INTERVAL_MS)
  const captionIndex = useCyclingIndex(captions.length, CAPTION_INTERVAL_MS)

  const progress = Math.min(PROGRESS_CAP, Math.round(PROGRESS_CAP * (1 - Math.exp(-elapsedMs / PROGRESS_HALF_LIFE_MS))))
  const elapsedSeconds = Math.floor(elapsedMs / 1000)

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm duration-200 animate-in fade-in-0"
    >
      <div className="relative flex w-full max-w-sm flex-col items-center gap-6 overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-2xl duration-300 animate-in fade-in-0 zoom-in-95">
        <Sparkles className="absolute left-5 top-5 h-4 w-4 text-primary/30 animate-pulse" />
        <Sparkles className="absolute right-7 top-9 h-3 w-3 text-primary/25 animate-pulse [animation-delay:500ms]" />
        <Sparkles className="absolute bottom-8 left-8 h-3 w-3 text-primary/25 animate-pulse [animation-delay:1000ms]" />
        <Sparkles className="absolute bottom-6 right-6 h-4 w-4 text-primary/30 animate-pulse [animation-delay:300ms]" />

        <div className="relative flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-primary/15" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary animation-duration-[1.2s]" />
          <div className="absolute inset-2 animate-spin rounded-full border-4 border-transparent border-b-primary/50 direction-[reverse] animation-duration-[1.8s]" />
          <div className="absolute inset-3 overflow-hidden rounded-full">
            <img
              key={photoIndex}
              src={SPOT_PHOTOS[photoIndex]}
              alt=""
              className="h-full w-full object-cover duration-500 animate-in fade-in-0 zoom-in-110"
            />
          </div>
        </div>

        <div className="text-center">
          <p className="text-4xl font-bold text-foreground tabular-nums">{progress}%</p>
          <p
            key={captionIndex}
            className="mt-2 max-w-xs text-sm font-medium text-foreground duration-500 animate-in fade-in-0 slide-in-from-bottom-1"
          >
            {captions[captionIndex]}
          </p>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-linear-to-r from-primary to-primary/60 transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground">{t('analyze.spotlight_elapsed', { seconds: elapsedSeconds })}</p>
      </div>
    </div>
  )
}
