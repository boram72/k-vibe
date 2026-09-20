import { useTranslation } from 'react-i18next'
import { Check, MapPin, Plus, Sparkles, X } from 'lucide-react'
import type { AnalysisPlace, AnalysisResult } from '@/api/analyze'
import { analysisStopId } from '@/lib/route-draft'
import { cn } from '@/lib/utils'

interface AnalysisResultListProps {
  result: AnalysisResult
  // 이미 "내 루트"에 담긴 장소들의 stop id(analysisStopId 기준) — 카드 배경/
  // 테두리 색과 배지 문구를 바꿔서 "추가됨"을 보여주는 데 쓴다(사용자 요청).
  // 테두리 두께가 아니라 색으로만 구분하는 이유는 다크모드에서도 잘 보이고,
  // 두께 변화로 인한 레이아웃 흔들림이 없어서.
  //
  // pink-500(Tailwind 기본 팔레트, 이 프로젝트의 디자인 토큰엔 없음)을 쓴
  // 이유: 이 테마의 `primary`는 실제로는 흑백(그레이스케일)이라 "추가됨" 표시로
  // 구분이 잘 안 됐고, `crowd-low`(초록)는 아래 "선택" 표시에 쓰이기 때문에
  // 겹치지 않게 홈 배너/튜토리얼 하이라이트와 같은 핑크로 통일했다(사용자 요청).
  addedPlaceIds: Set<string>
  // 사용자가 "선택해제"로 뺀 장소들의 stop id. 기본은 전부 선택 상태이고, 여기에 든 장소만
  // 제외 상태로 그려진다. 이 목록은 화면이 아니라 exclusion-store에 있어서 지도에 갔다
  // 돌아와도 유지된다(AnalyzePage 참고).
  excludedPlaceIds: Set<string>
  onToggleExcluded: (place: AnalysisPlace) => void
  // 카드의 지도 아이콘 — 이 장소 하나를 지도에서 빨간 마커로 보여준다(팝업 없음).
  onViewOnMap: (place: AnalysisPlace) => void
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

// Note: bulk "View All on Map" / "Add to Route" actions live in AnalyzePage as a
// sticky footer (so they stay reachable while this list scrolls), not in here.
// 카드를 눌러도 아무 일도 없다 — 장소별 동작은 카드 오른쪽의 지도 아이콘(지도에서 보기)과
// 선택/선택해제 버튼 두 개뿐이다. 모양은 페르소나 결과 화면(blocks/persona/route-result.tsx)의
// 카드와 같게 맞췄다(사용자 요청: "사용성 맞추기").
export function AnalysisResultList({
  result,
  addedPlaceIds,
  excludedPlaceIds,
  onToggleExcluded,
  onViewOnMap,
}: AnalysisResultListProps) {
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
        const stopId = analysisStopId(result.videoId, place.name)
        // 이미 루트에 담긴 장소는 선택/제외를 바꿀 수 없다(빼는 건 "내 루트" 탭에서) — 그래서
        // 제외 목록에 남아 있어도 "추가됨"이 우선한다.
        const isAdded = addedPlaceIds.has(stopId)
        const isExcluded = !isAdded && excludedPlaceIds.has(stopId)
        const toggleLabel = isExcluded ? t('analyze.select_action') : t('analyze.deselect_action')
        return (
          <div key={`${place.name}-${idx}`} className="flex gap-3">
            {/* 번호는 카드 테두리 밖 왼쪽에 두고 번호 사이를 세로선으로 잇는다 — 페르소나 결과 화면
                (blocks/persona/route-result.tsx)과 같은 구조(번호 열 + 카드)와 같은 크기·색이다(사용자 요청). */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-primary-foreground',
                  isExcluded ? 'bg-muted-foreground/40' : 'bg-primary',
                )}
              >
                {idx + 1}
              </div>
              {idx < result.places.length - 1 && <div className="my-1 min-h-4 w-px flex-1 bg-border" />}
            </div>

            <div
              className={cn(
                'mb-1 flex min-w-0 flex-1 items-center gap-3 rounded-xl border p-3 transition-colors',
                isAdded
                  ? 'border-pink-500 bg-pink-500/[0.06]'
                  : isExcluded
                    ? 'border-dashed border-border bg-muted/40'
                    : 'border-crowd-low/30 bg-crowd-low/5',
              )}
            >
              <div className={cn('min-w-0 flex-1', isExcluded && 'opacity-50')}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className={cn('text-sm font-semibold text-foreground', isExcluded && 'line-through')}>{place.name}</p>
                  {isExcluded && (
                    <span className="rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {t('analyze.excluded_label')}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{place.reason}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {/* 페르소나 카드/내 루트 카드의 지도 아이콘과 같은 자리·같은 모양(MapPin, h-7 w-7). */}
                <button
                  type="button"
                  onClick={() => onViewOnMap(place)}
                  aria-label={t('analyze.view_place_on_map', { name: place.name })}
                  title={t('analyze.view_place_on_map', { name: place.name })}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent"
                >
                  <MapPin className="h-4 w-4" />
                </button>
                {isAdded ? (
                  // "추가됨"은 상태 표시라 누를 수 없다 — 핑크는 기존 그대로.
                  <span className="flex h-7 shrink-0 items-center gap-1 rounded-lg bg-pink-500 px-2 text-[10px] font-semibold text-white">
                    <Check className="h-3 w-3" />
                    {t('analyze.added_label')}
                  </span>
                ) : (
                  // 기본은 "선택"(민트 카드)이고 버튼 글자는 "누르면 일어날 동작"이다: 선택된 카드엔
                  // "선택해제"(회색), 제외된 카드엔 "선택"(민트 채움). 좁은 화면에선 아이콘만
                  // 보여주고 글자는 md 이상에서만 노출(페르소나 결과 화면과 동일).
                  <button
                    type="button"
                    onClick={() => onToggleExcluded(place)}
                    aria-label={`${toggleLabel}: ${place.name}`}
                    title={toggleLabel}
                    className={cn(
                      'flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold transition-colors',
                      isExcluded ? 'bg-crowd-low text-white' : 'bg-border text-foreground',
                    )}
                  >
                    {isExcluded ? <Plus className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    <span className="hidden md:inline">{toggleLabel}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
