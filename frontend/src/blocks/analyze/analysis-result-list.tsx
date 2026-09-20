import { useTranslation } from 'react-i18next'
import { Check, Sparkles } from 'lucide-react'
import type { AnalysisPlace, AnalysisResult } from '@/api/analyze'
import { analysisStopId } from '@/lib/route-draft'
import { cn } from '@/lib/utils'

interface AnalysisResultListProps {
  result: AnalysisResult
  onSelectPlace: (place: AnalysisPlace) => void
  // 이미 "내 루트"에 담긴 장소들의 stop id(analysisStopId 기준) — 카드 배경/
  // 테두리 색과 배지 문구를 바꿔서 "추가됨"을 보여주는 데 쓴다(사용자 요청).
  // 테두리 두께가 아니라 색으로만 구분하는 이유는 다크모드에서도 잘 보이고,
  // 두께 변화로 인한 레이아웃 흔들림이 없어서.
  //
  // pink-500(Tailwind 기본 팔레트, 이 프로젝트의 디자인 토큰엔 없음)을 쓴
  // 이유: 이 테마의 `primary`는 실제로는 흑백(그레이스케일)이라 "추가됨" 표시로
  // 구분이 잘 안 됐고, `crowd-low`(초록)는 혼잡도 표시에 이미 쓰이는 의미가
  // 있어서 헷갈릴 수 있었음. 처음엔 보라색(violet-500)이었는데, 홈 배너/튜토리얼
  // 하이라이트와 같은 핑크로 통일했다(사용자 요청, 2026-09) — 카드 배경은 같은 핑크의
  // 아주 옅은 톤(6%), 배지는 진한 핑크 단색이다. 핑크→주황 그라데이션 배지도
  // 봤지만 화면 전체 분위기에 비해 너무 화려해서 단색으로 확정.
  addedPlaceIds: Set<string>
}

// AI(모델)가 실제로 추론해서 만든 결과인 소스들 — worker(규칙기반 매칭)/mock은
// 제외. "AI로 분석한 루트라 부정확할 수 있다"는 면책 문구는 이 소스일 때만 보여줌.
// popular(인기 영상 미리보기)도 포함: 실제로는 이 영상들을 진짜 Gemini 분석기로
// 돌려서 나온 결과를 캐싱해둔 것이라(popular-videos.data.ts 참고) 실제 분석
// 화면과 동일한 디자인(면책문구/배지/reason 문구)으로 보여주기로 함(사용자 요청).
const AI_SOURCES = new Set(['groq', 'gemini', 'openai', 'popular'])

const SOURCE_LABEL_KEYS: Record<string, string> = {
  groq: 'analyze.source_groq',
  gemini: 'analyze.source_gemini',
  openai: 'analyze.source_openai',
  mock: 'analyze.source_mock',
  // popular도 실제 분석 화면과 동일하게 "Gemini AI" 배지로 표시(위 AI_SOURCES 주석 참고)
  popular: 'analyze.source_gemini',
}

// Note: bulk "View All on Map" / "Add All to Route" actions live in AnalyzePage as a
// sticky footer (so they stay reachable while this list scrolls), not in here.
// Tapping an individual place card opens a choice popup (view this one on the map,
// or add just this one to the route) — see AnalyzePage's `choicePlace` dialog.
export function AnalysisResultList({ result, onSelectPlace, addedPlaceIds }: AnalysisResultListProps) {
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
      {result.places.map((place, idx) => {
        const isAdded = addedPlaceIds.has(analysisStopId(result.videoId, place.name))
        return (
          <button
            key={`${place.name}-${idx}`}
            type="button"
            onClick={() => onSelectPlace(place)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
              isAdded ? 'border-pink-500 bg-pink-500/[0.06]' : 'border-border bg-muted hover:border-primary/35',
            )}
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
                (choose_action_hint: "이 장소로 할 작업을 선택하세요")과 어휘를 맞췄다.
                2026-09: 이미 "내 루트"에 담긴 장소는 "추가됨" + 체크 아이콘으로
                바꿔서 한눈에 구분되게 했다(사용자 요청) — 취소 버튼은 안 만들고
                (삭제는 "내 루트" 탭에서), 눌러도 그대로 선택 팝업이 열려서
                지도에서 보는 건 계속 가능하다. */}
            <span
              className={cn(
                'flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold',
                isAdded ? 'bg-pink-500 text-white' : 'bg-border text-foreground',
              )}
            >
              {isAdded && <Check className="h-3 w-3" />}
              {isAdded ? t('analyze.added_label') : t('analyze.select_action')}
            </span>
          </button>
        )
      })}
    </div>
  )
}
