import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Compass, MapPin, Plus, Sparkles } from 'lucide-react'
import { UrlInputCard } from '@/blocks/analyze/url-input-card'
import { AnalysisLoading } from '@/blocks/analyze/analysis-loading'
import { AnalysisResultList } from '@/blocks/analyze/analysis-result-list'
import { ErrorBoundary } from '@/blocks/common/error-boundary'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { fetchAnalysis, type AnalysisPlace, type AnalysisResult } from '@/api/analyze'
import { EXAMPLE_URLS } from '@/blocks/analyze/analyze.data'
import { detectSnsPlatform, extractVideoId } from '@/lib/youtube'
import { addStopToRouteDraft, addStopsToRouteDraft } from '@/lib/route-draft'
import { usePageHelpStore } from '@/store/page-help-store'
import { useAnalyzeStore } from '@/store/analyze-store'
import type { Locale } from '@/i18n'
import type { MapFocusState } from './MapPage'

export default function AnalyzePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const setHelp = usePageHelpStore((s) => s.setHelp)
  const clearHelp = usePageHelpStore((s) => s.clearHelp)
  const { url, result, setUrl, setResult } = useAnalyzeStore()
  const [choicePlace, setChoicePlace] = useState<AnalysisPlace | null>(null)

  useEffect(() => {
    setHelp(t('analyze.help_title'), t('analyze.help_body'))
    return () => clearHelp()
  }, [setHelp, clearHelp, t])

  const mutation = useMutation({
    mutationFn: (targetUrl: string) => fetchAnalysis(targetUrl, i18n.language as Locale),
    onSuccess: (data) => setResult(data),
  })

  // Show the last completed result even right after remounting (e.g. coming back
  // from Map), before any new mutation has run in this component instance.
  const displayResult = mutation.data ?? result

  function runAnalysis(targetUrl: string) {
    const videoId = extractVideoId(targetUrl)
    if (detectSnsPlatform(targetUrl) !== 'youtube' || !videoId) return
    mutation.mutate(targetUrl)
  }

  function handleSelectExample(exampleUrl: string) {
    setUrl(exampleUrl)
    mutation.reset()
    runAnalysis(exampleUrl)
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
      id: `analysis-${result.videoId}-${place.name}`,
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
    addStopsToRouteDraft(displayResult.places.map((place) => toRouteStop(displayResult, place)))
    toast.success(t('analyze.route_saved'))
    navigate('../route')
  }

  function addOneToRoute(place: AnalysisPlace) {
    if (!displayResult) return
    addStopToRouteDraft(toRouteStop(displayResult, place))
    toast.success(t('analyze.route_saved'))
    setChoicePlace(null)
  }

  function viewOneOnMap(place: AnalysisPlace) {
    setChoicePlace(null)
    viewOnMap([place], true)
  }

  const showActionBar = !mutation.isPending && displayResult && displayResult.places.length > 0

  return (
    <div className="mx-auto flex min-h-full w-full flex-col px-4 md:max-w-2xl">
      <div className="flex-1 space-y-4 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">  
            {t('analyze.title')}
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t('analyze.subtitle')}</p>
        </div>

        <ErrorBoundary>
          <UrlInputCard
            url={url}
            onUrlChange={(next) => {
              setUrl(next)
              mutation.reset()
            }}
            onAnalyze={() => runAnalysis(url)}
            isAnalyzing={mutation.isPending}
            onSelectExample={handleSelectExample}
          />

          {mutation.isPending && <AnalysisLoading />}

          {mutation.isError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm font-semibold text-destructive">{t('analyze.error_title')}</p>
              <button
                type="button"
                onClick={() => runAnalysis(url)}
                className="mt-2 text-xs font-semibold text-destructive underline"
              >
                {t('analyze.retry')}
              </button>
            </div>
          )}

          {!mutation.isPending && !mutation.isError && displayResult && (
            <AnalysisResultList
              result={displayResult}
              onSelectPlace={setChoicePlace}
              onTryExample={() => handleSelectExample(EXAMPLE_URLS[0])}
            />
          )}

          {!mutation.isPending && !mutation.isError && !displayResult && (
            <div className="flex items-start gap-2.5 rounded-xl bg-muted p-3">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground/80">{t('analyze.local_mode_title')}</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t('analyze.local_mode_body')}</p>
              </div>
            </div>
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
          <div className="grid grid-cols-2 gap-3 mt-2">
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
