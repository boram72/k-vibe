import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { RouteResult } from '@/blocks/persona/route-result'
import { Button } from '@/components/ui/button'
import { ZoomableImage } from '@/blocks/common/zoomable-image'
import { fetchKContentPersonas, fetchKContentPersonaRoute, type KContentPersona } from '@/api/personas'
import { type RoutePlan } from '@/lib/route-timing'
import { addStopsToRouteDraft, savePersonaRoutePlan } from '@/lib/route-draft'
import { usePageHelpStore } from '@/store/page-help-store'
import { cn } from '@/lib/utils'
import type { Locale } from '@/i18n'

const START_TIME = '10:00'

function buildRouteTitle(persona: KContentPersona, locale: string): string {
  if (locale === 'ko') return `${persona.label} 하루 루트`
  if (locale === 'ja') return `${persona.label} 1日ルート`
  if (locale === 'zh') return `${persona.label}一日路线`
  return `${persona.label} One-Day Route`
}

// 2026-09 태스크보드 2번: 홈(persona-picker.tsx)의 PersonaCardImage와 동일한
// 정사각 카드 사진 룩으로 통일 — 카드 클릭 시 선택은 그대로 동작하되, 사진
// 자체는 클릭하면(ZoomableImage) 확대 팝업이 뜨도록 기존 PersonaAvatar와
// 같은 인터랙션 유지.
function PersonaCardImage({ persona }: { persona: KContentPersona }) {
  const [imageFailed, setImageFailed] = useState(false)

  if (persona.profileImg && !imageFailed) {
    return (
      <ZoomableImage
        fill
        src={persona.profileImg}
        alt={`${persona.label} profile`}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className="h-full w-full object-cover"
      />
    )
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-primary/15 text-2xl font-bold text-primary">
      {persona.badge}
    </div>
  )
}

export default function PersonaPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const setHelp = usePageHelpStore((s) => s.setHelp)
  const clearHelp = usePageHelpStore((s) => s.clearHelp)

  const locale = i18n.language as Locale
  const [selectedPersona, setSelectedPersona] = useState<KContentPersona | null>(null)
  const [plan, setPlan] = useState<RoutePlan | null>(null)

  // 홈 화면 페르소나 카드에서 곧장 들어온 경우(state.autoPersonaId) — 카드 목록을
  // 다시 보여주지 않고 곧바로 해당 페르소나의 루트를 생성해 미리보기로 넘어간다.
  // useRef 가드는 StrictMode의 effect 이중 실행 및 재선택 시 재트리거를 막는다.
  const autoPersonaId = (location.state as { autoPersonaId?: string } | null)?.autoPersonaId
  const autoTriggeredRef = useRef(false)
  const isQuickEntry = Boolean(autoPersonaId)

  useEffect(() => {
    setHelp(t('persona.help_title'), t('persona.help_body'))
    return () => clearHelp()
  }, [setHelp, clearHelp, t])

  const personasQuery = useQuery({
    queryKey: ['k-content-personas', locale],
    queryFn: () => fetchKContentPersonas(locale),
  })

  const mutation = useMutation({
    mutationFn: async (persona: KContentPersona) => {
      const scheduled = await fetchKContentPersonaRoute(persona.id, START_TIME, locale)
      const title = buildRouteTitle(persona, locale)
      const result: RoutePlan = {
        ...scheduled,
        title,
        summary: scheduled.summary ?? persona.description,
        shareText: `${title}: ${scheduled.stops.map((s) => s.name).join(' -> ')}`,
      }
      return result
    },
    onSuccess: (result) => {
      setPlan(result)
      toast.success(t('persona.route_generated'))
    },
  })

  function handleSelectPersona(persona: KContentPersona) {
    setSelectedPersona(persona)
    mutation.mutate(persona)
  }

  useEffect(() => {
    if (!isQuickEntry || autoTriggeredRef.current || !personasQuery.data) return
    const persona = personasQuery.data.find((p) => p.id === autoPersonaId)
    if (!persona) return
    autoTriggeredRef.current = true
    // mutate() is an imperative call to an external system (the route-generation
    // request), not a direct setState — the effect only reads selectedPersona
    // back out via the retryPersona fallback below, so no setState happens here.
    mutation.mutate(persona)
  }, [isQuickEntry, autoPersonaId, personasQuery.data, mutation])

  function reset() {
    setSelectedPersona(null)
    setPlan(null)
    mutation.reset()
    // 홈에서 바로 들어온 경우 초기화하면 빈 카드 목록이 아니라 홈으로 돌려보낸다 —
    // 이 페이지엔 더 이상 수동 선택 목록이 없을 수 있으므로(quick entry 실패 시 예외).
    if (isQuickEntry) navigate('..')
  }

  function handleAddToRoute() {
    if (!plan) return
    savePersonaRoutePlan(plan)
    const ts = Date.now()
    addStopsToRouteDraft(
      plan.stops.map((s) => ({ ...s, id: `${s.id}-${ts}`, placeId: s.id, fromPersona: true })),
    )
    toast.success(t('persona.route_saved'))
    navigate('../route')
  }

  async function handleShare() {
    if (!plan) return
    try {
      if (navigator.share) {
        await navigator.share({ title: plan.title, text: plan.shareText, url: window.location.href })
        toast.success(t('persona.shared'))
        return
      }
      await navigator.clipboard.writeText(plan.shareText)
      toast.success(t('persona.copied'))
    } catch {
      toast.error(t('persona.share_unavailable'))
    }
  }

  if (plan) {
    return (
      <div className="mx-auto w-full space-y-4 px-4 py-4 md:max-w-2xl">
        <RouteResult plan={plan} onReset={reset} onAddToRoute={handleAddToRoute} onShare={handleShare} />
      </div>
    )
  }

  // 홈에서 곧장 들어온 경우, 결과가 나오기 전까지는 수동 선택 목록을 다시 보여주지
  // 않고(이미 홈에서 골랐으므로) 생성 중 로딩만 보여준다.
  if (isQuickEntry && !mutation.isError) {
    return (
      <div className="mx-auto flex min-h-full w-full flex-col items-center justify-center gap-3 px-4 py-10 text-center md:max-w-2xl">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        <p className="text-sm text-muted-foreground">{t('persona.generating')}</p>
      </div>
    )
  }

  if (isQuickEntry && mutation.isError) {
    // 자동 트리거 경로라 setSelectedPersona가 아직 한 번도 안 불렸을 수 있어(효과 안
    // setState 금지 규칙 때문에 effect에서는 mutate()만 호출) autoPersonaId로 다시 찾는다.
    const retryPersona = selectedPersona ?? personasQuery.data?.find((p) => p.id === autoPersonaId) ?? null
    return (
      <div className="mx-auto flex min-h-full w-full flex-col items-center justify-center gap-3 px-4 py-10 text-center md:max-w-2xl">
        <p className="text-sm font-semibold text-destructive">{t('persona.error_title')}</p>
        <Button
          variant="destructive"
          size="sm"
          disabled={!retryPersona || mutation.isPending}
          onClick={() => retryPersona && handleSelectPersona(retryPersona)}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {t('persona.retry')}
        </Button>
      </div>
    )
  }

  return (
    // md:max-w-6xl — RoutePage("내 루트")와 동일한 데스크탑 폭. 그리드가
    // md:grid-cols-4로 이미 유동적이라 폭을 넓히면 카드도 그만큼 같이 커짐
    // (별도 카드 크기 클래스 조정 불필요).
    <div className="mx-auto flex min-h-full w-full flex-col px-4 md:max-w-6xl">
      <div className="flex-1 space-y-4 py-4">
        <div>
          {/* <p className="text-xs font-semibold text-primary">{t('persona.generator_eyebrow')}</p>
          <h2 className="mt-1 text-lg font-bold text-foreground">{t('persona.title')}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('persona.subtitle')}</p> */}
          {/* <p className="text-xs font-semibold text-primary">
            {t("persona.k_content_eyebrow")}
          </p> */}
          <h3 className="mt-0.5 text-base font-bold text-foreground">
            {t("persona.k_content_title")}
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {t("persona.k_content_subtitle")}
          </p>
          <div className="mt-4 h-1 rounded-full bg-primary" />
        </div>

        <div className="rounded-xl bg-primary/[0.06] p-3">
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            {personasQuery.isPending &&
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse overflow-hidden rounded-xl border border-border bg-muted md:rounded-2xl"
                >
                  <div className="aspect-square w-full bg-muted" />
                </div>
              ))}

            {!personasQuery.isPending &&
              (personasQuery.data ?? []).map((persona) => {
                const isSelected = selectedPersona?.id === persona.id;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => handleSelectPersona(persona)}
                    disabled={mutation.isPending}
                    className={cn(
                      "overflow-hidden rounded-xl border text-left transition-all disabled:opacity-70 md:rounded-2xl",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:border-primary/60 hover:bg-primary/10",
                    )}
                  >
                    <div className="aspect-square w-full bg-muted">
                      <PersonaCardImage persona={persona} />
                    </div>
                    <div className="space-y-0.5 p-2 md:space-y-1 md:p-3">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs font-semibold text-foreground md:text-sm">
                          {persona.label}
                        </p>
                        {mutation.isPending && isSelected && (
                          <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
                        )}
                      </div>
                      <span className="inline-block rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground md:px-2 md:text-[10px]">
                        {persona.routeCnt}
                        {t("persona.stops_suffix")}
                      </span>
                      <p className="line-clamp-2 text-[10px] leading-4 text-muted-foreground md:text-xs md:leading-5">
                        {persona.description}
                      </p>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {mutation.isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm font-semibold text-destructive">
              {t("persona.error_title")}
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="mt-2"
              disabled={!selectedPersona || mutation.isPending}
              onClick={() =>
                selectedPersona && mutation.mutate(selectedPersona)
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("persona.retry")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
