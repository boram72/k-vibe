import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Compass, MapPin, PlayCircle, Plus, RotateCcw } from 'lucide-react'
import { UrlInputCard } from '@/blocks/analyze/url-input-card'
import { UsageTutorial } from '@/blocks/analyze/usage-tutorial'
import { PopularVideos } from '@/blocks/analyze/popular-videos'
import { isCannedAnalysisVideo } from '@/blocks/analyze/popular-videos.data'
import { AnalysisProgress } from '@/blocks/analyze/analysis-progress'
import { AnalysisResultList } from '@/blocks/analyze/analysis-result-list'
import { ErrorBoundary } from '@/blocks/common/error-boundary'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { AnalysisPlace, AnalysisResult } from '@/api/analyze'
import { detectSnsPlatform, extractVideoId } from '@/lib/youtube'
import { addStopToRouteDraft, addStopsToRouteDraft, analysisStopId, readRouteDraftStopIds } from '@/lib/route-draft'
import { usePageHelpStore } from '@/store/page-help-store'
import { useAnalyzeStore } from '@/store/analyze-store'
import { useTourStore, canAutoStartTour } from '@/store/tour-store'
import { ANALYZE_TOUR_KEY } from '@/blocks/tour/tour-steps'
import type { Locale } from '@/i18n'
import type { MapFocusState } from './MapPage'

export default function AnalyzePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const setHelp = usePageHelpStore((s) => s.setHelp)
  const clearHelp = usePageHelpStore((s) => s.clearHelp)
  const startTour = useTourStore((s) => s.start)
  const { url, result, status, progress, errorKind, setUrl, clearResult, reset, startAnalysis, startCannedAnalysis } =
    useAnalyzeStore()
  const [choicePlace, setChoicePlace] = useState<AnalysisPlace | null>(null)
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

  function viewOnMap(places: AnalysisPlace[], openDetail = false) {
    const state: MapFocusState = { focusPlaces: places.map(toFocusPlace), openDetail }
    navigate('../map', { state })
  }

  function viewAllOnMap() {
    if (displayResult) viewOnMap(displayResult.places)
  }

  function addAllToRoute() {
    if (!displayResult || displayResult.places.length === 0) return
    const stops = displayResult.places.map((place) => toRouteStop(displayResult, place))
    const { addedCount } = addStopsToRouteDraft(stops)
    setAddedPlaceIds((prev) => new Set([...prev, ...stops.map((s) => s.id)]))
    toast.success(addedCount > 0 ? t('analyze.route_saved') : t('common.already_in_route'))
    navigate('../route')
  }

  function addOneToRoute(place: AnalysisPlace) {
    if (!displayResult) return
    const stop = toRouteStop(displayResult, place)
    const { added } = addStopToRouteDraft(stop)
    setAddedPlaceIds((prev) => new Set(prev).add(stop.id))
    toast.success(added ? t('analyze.route_saved') : t('common.already_in_route'))
    setChoicePlace(null)
  }

  function viewOneOnMap(place: AnalysisPlace) {
    setChoicePlace(null)
    viewOnMap([place], true)
  }

  const showActionBar = !isAnalyzing && displayResult && displayResult.places.length > 0

  // 되돌릴 게 있을 때만(URL이 채워졌거나 분석이 시작된 뒤) 초기화 버튼을 보인다
  // — 처음 화면에서는 눌러도 아무 일도 안 일어나는 버튼이라 숨긴다.
  const canReset = url !== '' || status !== 'idle'

  function handleReset() {
    setChoicePlace(null)
    reset()
  }

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
            <AnalysisResultList result={displayResult} onSelectPlace={setChoicePlace} addedPlaceIds={addedPlaceIds} />
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
          <Button onClick={addAllToRoute}>
            <Compass className="h-3.5 w-3.5" />
            {t('analyze.build_route')}
          </Button>
        </div>
      )}

      <Dialog open={!!choicePlace} onOpenChange={(open) => !open && setChoicePlace(null)}>
        <DialogContent className="p-6 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{choicePlace?.name}</DialogTitle>
            <DialogDescription>{t('analyze.choose_action_hint')}</DialogDescription>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => choicePlace && viewOneOnMap(choicePlace)}>
              <MapPin className="h-3.5 w-3.5" />
              {t('analyze.view_on_map')}
            </Button>
            <Button onClick={() => choicePlace && addOneToRoute(choicePlace)}>
              <Plus className="h-3.5 w-3.5" />
              {t('analyze.add_to_route')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
