import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { MapPin, PlayCircle, RotateCcw, Route } from 'lucide-react'
import { UrlInputCard } from '@/blocks/analyze/url-input-card'
import { UsageTutorial } from '@/blocks/analyze/usage-tutorial'
import { PopularVideos } from '@/blocks/analyze/popular-videos'
import { isCannedAnalysisVideo } from '@/blocks/analyze/popular-videos.data'
import { AnalysisProgress } from '@/blocks/analyze/analysis-progress'
import { AnalysisResultList } from '@/blocks/analyze/analysis-result-list'
import { ErrorBoundary } from '@/blocks/common/error-boundary'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { AnalysisPlace, AnalysisResult } from '@/api/analyze'
import { detectSnsPlatform, extractVideoId } from '@/lib/youtube'
import { addStopsToRouteDraft, analysisStopId, readRouteDraftStopIds } from '@/lib/route-draft'
import { usePageHelpStore } from '@/store/page-help-store'
import { useAnalyzeStore, analyzeExclusionScope } from '@/store/analyze-store'
import { EMPTY_EXCLUDED, useExclusionStore } from '@/store/exclusion-store'
import { useTourStore, canAutoStartTour } from '@/store/tour-store'
import { ANALYZE_TOUR_KEY } from '@/blocks/tour/tour-steps'
import type { Locale } from '@/i18n'
import type { MapFocusState } from './MapPage'

export default function AnalyzePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const setHelp = usePageHelpStore((s) => s.setHelp)
  const clearHelp = usePageHelpStore((s) => s.clearHelp)
  const setTourResetAction = usePageHelpStore((s) => s.setTourResetAction)
  const startTour = useTourStore((s) => s.start)
  const { url, result, status, progress, errorKind, setUrl, clearResult, reset, startAnalysis, startCannedAnalysis } =
    useAnalyzeStore()
  const [tutorialOpen, setTutorialOpen] = useState(false)
  // 카드에 "추가됨" 표시를 하기 위한 상태 — 마운트 시점에 한 번 localStorage를
  // 읽어서 초기화한다. "내 루트" 탭에서 삭제하고 이 탭으로 돌아오면(라우트
  // 전환으로 이 컴포넌트가 다시 마운트됨) 그때 다시 읽어서 최신 상태로
  // 맞춰지므로, 실시간 구독 없이 이 정도로 충분하다(사용자 확인 완료).
  const [addedPlaceIds, setAddedPlaceIds] = useState<Set<string>>(() => readRouteDraftStopIds())

  useEffect(() => {
    setHelp(t('analyze.help_title'), t('analyze.help_body'))
    return () => clearHelp()
  }, [setHelp, clearHelp, t])

  const isAnalyzing = status === 'running'
  const hasError = status === 'error'

  // URL 입력창/인기 영상처럼 투어가 가리킬 요소는 결과가 없는 idle 화면에만
  // 있으므로, 결과가 이미 있는 상태(예: 분석 후 재방문)에서는 자동으로
  // 띄우지 않는다.
  useEffect(() => {
    if (!result && canAutoStartTour(ANALYZE_TOUR_KEY)) startTour(ANALYZE_TOUR_KEY)
  }, [result, startTour])
  // 2026-09: 분석이 store에서 백그라운드로 돌기 때문에(다른 탭으로 이동해도
  // 계속 진행) 결과도 react-query가 아니라 store에서 바로 읽는다 — 이 컴포넌트가
  // 언마운트됐다 다시 마운트돼도(다른 탭 갔다 옴) store 상태를 그대로 이어받는다.
  const displayResult = result

  // 대화 중 요청 — 결과 카드의 "선택해제"(제외) 상태. 기본은 전부 선택이고, 뺀 장소의 stop id만
  // exclusion-store에 든다. 화면 useState가 아니라 store에 두는 이유: 카드의 지도 아이콘으로
  // 지도에 갔다 "돌아가기"로 돌아오면 이 페이지가 새로 만들어져서, useState였다면 뺀 장소가
  // 전부 되살아났다(분석 결과 자체는 analyze-store에 남아 있어 그대로인데 선택만 초기화).
  // 새 분석/초기화 때는 analyze-store가 같이 비운다.
  const exclusionScope = analyzeExclusionScope(displayResult?.videoId ?? '')
  const excludedList = useExclusionStore((s) => s.excluded[exclusionScope]) ?? EMPTY_EXCLUDED
  const toggleExcluded = useExclusionStore((s) => s.toggle)
  const excludedPlaceIds = useMemo(() => new Set(excludedList), [excludedList])

  function runAnalysis(targetUrl: string) {
    const videoId = extractVideoId(targetUrl)
    if (detectSnsPlatform(targetUrl) !== 'youtube' || !videoId) return
    // "이 유튜브를 많이 검색해요" 6개 카드에서 고른 URL만 canned 경로(실제
    // /analyze 미호출, 무료 AI 토큰 절약) — 직접 붙여넣은 URL은 그대로 실제 분석
    if (isCannedAnalysisVideo(videoId)) {
      startCannedAnalysis(videoId, i18n.language as Locale)
      return
    }
    startAnalysis(targetUrl, i18n.language as Locale)
  }

  function toFocusPlace(place: AnalysisPlace) {
    return {
      id: `analysis-${place.name}`,
      name: place.name,
      category: 'culture' as const,
      address: t('analyze.detected_address'),
      lat: place.lat,
      lng: place.lng,
      tags: ['sns'],
    }
  }

  function toRouteStop(result: AnalysisResult, place: AnalysisPlace) {
    return {
      id: analysisStopId(result.videoId, place.name),
      name: place.name,
      category: 'SNS',
      address: t('analyze.detected_address'),
      crowdLevel: place.confidence >= 0.9 ? ('mid' as const) : ('low' as const),
      lat: place.lat,
      lng: place.lng,
      description: place.reason,
      tags: ['sns', 'analysis'],
    }
  }

  // 대화 중 요청 — 개별 장소든 전체든 지도로 보낼 때 상세 팝업은 자동으로 열지 않는다
  // (페르소나 진입과 동일). 분석기에서 넘어온 focusPlaces는 지도에서 전부 빨간 핀이라
  // 팝업 없이도 그 장소가 표시되고, 사용자가 핀/목록을 눌렀을 때만 팝업이 뜬다.
  // 돌아가기는 지도 위 버튼(MapCanvas)이 맡는다.
  function viewOnMap(places: AnalysisPlace[]) {
    const state: MapFocusState = { focusPlaces: places.map(toFocusPlace) }
    navigate('../map', { state })
  }

  function viewAllOnMap() {
    if (displayResult) viewOnMap(displayResult.places)
  }

  function toggleExcludedPlace(place: AnalysisPlace) {
    if (!displayResult) return
    toggleExcluded(exclusionScope, analysisStopId(displayResult.videoId, place.name))
  }

  // 하단 "루트에 추가" — 선택 상태(제외하지 않았고 아직 루트에 없는) 장소만 담는다. 이미 루트에
  // 있는 장소("추가됨")는 건너뛰고, 새로 담을 게 하나도 없으면 "이미 추가된 루트예요"만
  // 띄우고 화면은 그대로 둔다(담은 게 있을 때만 내 루트로 이동).
  function addSelectedToRoute() {
    if (!displayResult) return
    const stops = displayResult.places
      .map((place) => toRouteStop(displayResult, place))
      .filter((stop) => !addedPlaceIds.has(stop.id) && !excludedPlaceIds.has(stop.id))
    if (stops.length === 0) {
      toast.success(t('common.already_in_route'))
      return
    }
    addStopsToRouteDraft(stops)
    setAddedPlaceIds((prev) => new Set([...prev, ...stops.map((s) => s.id)]))
    toast.success(t('analyze.route_saved'))
    navigate('../route')
  }

  const showActionBar = !isAnalyzing && displayResult && displayResult.places.length > 0

  // 전부 제외했고 이미 담긴 것도 없으면 누를 게 없으므로 비활성. 담긴("추가됨") 장소가 하나라도
  // 있으면 활성으로 두고, 눌렀을 때 위에서 "이미 추가된 루트예요"를 알려준다.
  const canAddToRoute = Boolean(
    displayResult?.places.some((place) => {
      const stopId = analysisStopId(displayResult.videoId, place.name)
      return addedPlaceIds.has(stopId) || !excludedPlaceIds.has(stopId)
    }),
  )

  // 되돌릴 게 있을 때만(URL이 채워졌거나 분석이 시작된 뒤) 초기화 버튼을 보인다
  // — 처음 화면에서는 눌러도 아무 일도 안 일어나는 버튼이라 숨긴다.
  const canReset = url !== '' || status !== 'idle'

  const handleReset = useCallback(() => {
    reset()
  }, [reset])

  // 분석 중/결과/오류 화면에서는 투어가 가리킬 요소(인기 영상 목록, "이렇게 사용해요"
  // 버튼)가 화면에 없어서, "?"를 눌러도 어두운 배경 위에 말풍선만 떠서 오류처럼 보였다
  // (사용자 지적). 이 상태에서는 헤더 "?"가 "초기화 후 진행할까요?"를 먼저 묻고, 확인하면
  // 위 초기화 버튼과 같은 동작(처음 화면으로 되돌리기)을 한 뒤 투어를 시작한다.
  const needsTourReset = status !== 'idle'
  useEffect(() => {
    setTourResetAction(needsTourReset ? handleReset : null)
    return () => setTourResetAction(null)
  }, [needsTourReset, handleReset, setTourResetAction])

  return (
    <div className="mx-auto flex min-h-full w-full flex-col px-4 md:max-w-2xl">
      <div className="flex-1 space-y-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">{t('analyze.title')}</h2>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t('analyze.subtitle')}</p>
          </div>
          {/* 페르소나 결과 화면(blocks/persona/route-result.tsx)의 "다른 루트
              만들기" 버튼과 같은 역할(처음으로 되돌리기)이라 같은 버튼 모양/
              같은 자리(제목 오른쪽)로 맞췄다(사용자 요청). */}
          {canReset && (
            <button
              type="button"
              onClick={handleReset}
              aria-label={t('analyze.reset')}
              title={t('analyze.reset')}
              className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>

        <ErrorBoundary>
          <UrlInputCard
            url={url}
            onUrlChange={(next) => {
              setUrl(next)
              clearResult()
            }}
            onAnalyze={() => runAnalysis(url)}
            isAnalyzing={isAnalyzing}
          />

          {isAnalyzing && <AnalysisProgress percent={progress} />}

          {hasError && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4">
                <p className="flex-1 text-xs leading-5 text-destructive">
                  {t(errorKind === 'timeout' ? 'analyze.error_timeout' : 'analyze.error_generic')}
                </p>
                <Button
                  size="sm"
                  onClick={() => runAnalysis(url)}
                  className="shrink-0 bg-destructive/70 text-white hover:bg-destructive/85"
                >
                  {t('analyze.retry')}
                </Button>
              </div>

              {errorKind !== 'timeout' && (
                <div className="rounded-xl border border-border bg-muted p-3">
                  <p className="mb-1.5 text-xs font-semibold text-foreground/80">{t('analyze.error_check_hint')}</p>
                  <ul className="space-y-1 text-xs leading-5 text-muted-foreground">
                    <li>1) {t('analyze.error_reason_unrelated')}</li>
                    <li>2) {t('analyze.error_reason_korea_only')}</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {!isAnalyzing && !hasError && displayResult && (
            <AnalysisResultList
              result={displayResult}
              addedPlaceIds={addedPlaceIds}
              excludedPlaceIds={excludedPlaceIds}
              onToggleExcluded={toggleExcludedPlace}
              onViewOnMap={(place) => viewOnMap([place])}
            />
          )}

          {!isAnalyzing && !hasError && !displayResult && (
            <>
              <button
                type="button"
                data-tour="analyze-tutorial-button"
                onClick={() => setTutorialOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs font-semibold text-foreground/80 transition-colors hover:bg-primary/10"
              >
                <PlayCircle className="h-3.5 w-3.5 text-primary" />
                {t('analyze.tutorial_title')}
              </button>

              <PopularVideos
                onSelect={(videoUrl) => {
                  setUrl(videoUrl)
                  clearResult()
                }}
              />
            </>
          )}
        </ErrorBoundary>
      </div>

      {showActionBar && (
        <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-2 border-t border-border bg-background p-4">
          <Button variant="outline" onClick={viewAllOnMap}>
            <MapPin className="h-3.5 w-3.5" />
            {t('analyze.view_all_on_map')}
          </Button>
          <Button onClick={addSelectedToRoute} disabled={!canAddToRoute}>
            <Route className="h-3.5 w-3.5" />
            {t('analyze.build_route')}
          </Button>
        </div>
      )}

      <Dialog open={tutorialOpen} onOpenChange={setTutorialOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('analyze.tutorial_title')}</DialogTitle>
          </DialogHeader>
          <UsageTutorial />
        </DialogContent>
      </Dialog>
    </div>
  )
}
