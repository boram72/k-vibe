import { useTranslation } from 'react-i18next'
import { AlertCircle, Sparkles, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AnalysisPlace, AnalysisResult } from '@/api/analyze'

interface AnalysisResultListProps {
  result: AnalysisResult
  onSelectPlace: (place: AnalysisPlace) => void
  onTryExample: () => void
}

// AI(모델)가 실제로 추론해서 만든 결과인 소스들 — worker(규칙기반 매칭)/mock은
// 제외. "AI로 분석한 루트라 부정확할 수 있다"는 면책 문구는 이 소스일 때만 보여줌.
const AI_SOURCES = new Set(['groq', 'gemini', 'openai'])

const SOURCE_LABEL_KEYS: Record<string, string> = {
  groq: 'analyze.source_groq',
  gemini: 'analyze.source_gemini',
  openai: 'analyze.source_openai',
  mock: 'analyze.source_mock',
}

// Note: bulk "View All on Map" / "Add All to Route" actions live in AnalyzePage as a
// sticky footer (so they stay reachable while this list scrolls), not in here.
// Tapping an individual place card opens a choice popup (view this one on the map,
// or add just this one to the route) — see AnalyzePage's `choicePlace` dialog.
export function AnalysisResultList({ result, onSelectPlace, onTryExample }: AnalysisResultListProps) {
  const { t } = useTranslation()
  const sourceLabel = t(SOURCE_LABEL_KEYS[result.source] ?? 'analyze.source_worker')
  const showAiDisclaimer = AI_SOURCES.has(result.source)

  if (result.places.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted p-4">
        <p className="text-sm font-semibold text-foreground">{t('analyze.empty_title')}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('analyze.empty_body')}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onTryExample}>
          <Video className="h-3.5 w-3.5" />
          {t('analyze.try_example')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {t('analyze.found_spots', { count: result.places.length })}
          </p>
          <p className="truncate text-xs text-muted-foreground">{result.title}</p>
        </div>
        <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
          {sourceLabel}
        </span>
      </div>

      {showAiDisclaimer && (
        <div className="flex items-start gap-2 rounded-lg bg-crowd-mid/10 px-3 py-2">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-crowd-mid" />
          <p className="text-[11px] leading-4 text-crowd-mid">{t('analyze.ai_disclaimer')}</p>
        </div>
      )}

      {result.places.map((place, idx) => {
        const confidencePercent = Math.max(0, Math.min(100, Math.round(place.confidence * 100)))
        const showEstimated = confidencePercent < 80

        return (
          <button
            key={`${place.name}-${idx}`}
            type="button"
            onClick={() => onSelectPlace(place)}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted p-3 text-left transition-colors hover:border-primary/35"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {idx + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{place.name}</p>
              {showEstimated && (
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-crowd-mid/10 px-2 py-0.5 text-[10px] font-semibold text-crowd-mid">
                  <AlertCircle className="h-2.5 w-2.5" />
                  {t('analyze.estimated_location')}
                </p>
              )}
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{place.reason}</p>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"
                role="progressbar"
                aria-label={`${t('analyze.confidence')} ${confidencePercent}%`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={confidencePercent}
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-semibold text-primary">{confidencePercent}%</p>
              <p className="text-[10px] text-muted-foreground">{t('analyze.confidence')}</p>
              <span className="mt-2 inline-flex rounded-lg bg-border px-2 py-1 text-[10px] font-semibold text-foreground">
                {t('analyze.map')}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
