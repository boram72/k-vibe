import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import type { AnalysisPlace, AnalysisResult } from '@/api/analyze'

interface AnalysisResultListProps {
  result: AnalysisResult
  onSelectPlace: (place: AnalysisPlace) => void
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
export function AnalysisResultList({ result, onSelectPlace }: AnalysisResultListProps) {
  const { t } = useTranslation()
  const sourceLabel = t(SOURCE_LABEL_KEYS[result.source] ?? 'analyze.source_worker')
  const showAiDisclaimer = AI_SOURCES.has(result.source)

  if (result.places.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted p-4">
        <p className="text-sm font-semibold text-foreground">{t('analyze.empty_title')}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('analyze.empty_body')}</p>
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
        // 2026-09: 기존 노란 계열(crowd-mid)이 눈에 잘 안 띈다는 피드백으로 빨간
        // 계열(destructive)로 교체 — 카드 안 다른 경고성 요소(에러 박스, YouTube
        // 배지)와 같은 톤이라 배경/글자색 조합도 이미 검증된 조합.
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
          <p className="text-[11px] leading-4 text-destructive">{t('analyze.ai_disclaimer')}</p>
        </div>
      )}

      {/* 2026-09: 장소별 "신뢰도 %"와 "추정 위치" 배지를 제거했다 — 실제 분석
          경로(Gemini 영상분석)에서는 장소명만 추출되고 좌표는 Kakao 검색으로
          붙이기 때문에 place.confidence가 항상 고정값(0.75)이라 신뢰도라는
          이름에 걸맞은 실제 값이 아니었음(사용자 피드백으로 확인). place.confidence
          자체는 API 응답에 남아있고 다른 곳(루트에 추가 시 혼잡도 추정)에서
          여전히 쓰이므로 타입/백엔드는 그대로, 이 화면의 표시만 없앤다. */}
      {result.places.map((place, idx) => (
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
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{place.reason}</p>
          </div>
          {/* 2026-09: "지도"라는 라벨이 실제 동작(눌렀을 때 "지도에서 보기"/
              "루트에 추가" 중 고르는 선택 팝업이 뜸)과 안 맞는다는 피드백으로
              "선택"으로 교체 — AnalyzePage의 choicePlace 다이얼로그 안내문
              (choose_action_hint: "이 장소로 할 작업을 선택하세요")과 어휘를 맞췄다. */}
          <span className="shrink-0 rounded-lg bg-border px-2 py-1 text-[10px] font-semibold text-foreground">
            {t('analyze.select_action')}
          </span>
        </button>
      ))}
    </div>
  )
}
