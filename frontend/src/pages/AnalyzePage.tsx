import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Compass, MapPin, Plus, Sparkles } from 'lucide-react'
import { UrlInputCard } from '@/blocks/analyze/url-input-card'
import { UsageTutorial } from '@/blocks/analyze/usage-tutorial'
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
import type { Locale } from '@/i18n'
import type { MapFocusState } from './MapPage'

export default function AnalyzePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const setHelp = usePageHelpStore((s) => s.setHelp)
  const clearHelp = usePageHelpStore((s) => s.clearHelp)
  const { url, result, status, progress, errorKind, setUrl, clearResult, startAnalysis } = useAnalyzeStore()
  const [choicePlace, setChoicePlace] = useState<AnalysisPlace | null>(null)
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
  // 2026-09: 분석이 store에서 백그라운드로 돌기 때문에(다른 탭으로 이동해도
  // 계속 진행) 결과도 react-query가 아니라 store에서 바로 읽는다 — 이 컴포넌트가
  // 언마운트됐다 다시 마운트돼도(다른 탭 갔다 옴) store 상태를 그대로 이어받는다.
  const displayResult = result

  function runAnalysis(targetUrl: string) {
    const videoId = extractVideoId(targetUrl)
    if (detectSnsPlatform(targetUrl) !== 'youtube' || !videoId) return
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

  return (
    <div className="mx-auto flex min-h-full w-full flex-col px-4 md:max-w-2xl">
      <div className="flex-1 space-y-4 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">{t('analyze.title')}</h2>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t('analyze.subtitle')}</p>
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
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm font-semibold text-destructive">{t('analyze.error_title')}</p>
              <p className="mt-1 text-xs leading-5 text-destructive/80">
                {t(errorKind === 'timeout' ? 'analyze.error_timeout' : 'analyze.error_generic')}
              </p>
              <button
                type="button"
                onClick={() => runAnalysis(url)}
                className="mt-2 text-xs font-semibold text-destructive underline"
              >
                {t('analyze.retry')}
              </button>
            </div>
          )}

          {!isAnalyzing && !hasError && displayResult && (
            <AnalysisResultList result={displayResult} onSelectPlace={setChoicePlace} addedPlaceIds={addedPlaceIds} />
          )}

          {!isAnalyzing && !hasError && !displayResult && (
            <>
              <div className="flex items-start gap-2.5 rounded-xl bg-muted p-3">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-semibold text-foreground/80">{t('analyze.local_mode_title')}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t('analyze.local_mode_body')}</p>
                </div>
              </div>
              <UsageTutorial />
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
    </div>
  )
}
