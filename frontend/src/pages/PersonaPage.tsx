import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { RouteResult } from '@/blocks/persona/route-result'
import { Button } from '@/components/ui/button'
import { ZoomableImage } from '@/blocks/common/zoomable-image'
import { MarqueeText } from '@/blocks/common/marquee-text'
import { fetchKContentPersonas, fetchKContentPersonaRoute, type KContentPersona } from '@/api/personas'
import { type RoutePlan } from '@/lib/route-timing'
import { addStopsToRouteDraft, savePersonaRoutePlan } from '@/lib/route-draft'
import { usePageHelpStore } from '@/store/page-help-store'
import { useTourStore, canAutoStartTour } from '@/store/tour-store'
import { PERSONA_TOUR_KEY } from '@/blocks/tour/tour-steps'
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
function PersonaCardImage({ persona, disableZoom }: { persona: KContentPersona; disableZoom?: boolean }) {
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
        disableZoom={disableZoom}
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
  const startTour = useTourStore((s) => s.start)
  const activeTourKey = useTourStore((s) => s.activeTourKey)
  const tourStepIndex = useTourStore((s) => s.stepIndex)
  // 페르소나 투어 1단계(카드 하이라이트, PERSONA_TOUR_STEPS[0])가 첫 번째
  // 카드를 가리키는 동안만 그 카드 사진의 확대 팝업을 끈다 — 사진(카드에서
  // 가장 크고 누르기 쉬운 영역)을 눌렀을 때 확대 팝업이 아니라 실제
  // "선택"이 일어나야 한다는 사용자 피드백 대응. 투어가 끝나면 평소처럼
  // 사진을 눌러 확대해볼 수 있다.
  const firstCardZoomDisabled = activeTourKey === PERSONA_TOUR_KEY && tourStepIndex === 0

  const locale = i18n.language as Locale

  // 2026-09 QA 5번 — "뒤로가기 시 내 루트로 잘못 이동"의 실제 원인은 목적지가
  // 아니라 이 화면의 step1(카드 선택)→step2(생성 결과) 전환이 실제 브라우저
  // 히스토리에 안 쌓이고 컴포넌트 로컬 state로만 처리되던 것 — 그래서
  // "뒤로가기"가 이 화면 안에서의 이전 단계가 아니라 이 페이지 진입 이전의
  // 아무 화면으로 튀었음(사이드바에서 "내 루트"를 거쳐 들어온 경우엔 거기로).
  // 홈 카드 클릭(state.autoPersonaId)이든 이 화면 자체의 카드 선택(아래
  // state.selectedPersonaId)이든 전부 "실제 navigate 호출로 새 히스토리
  // 항목을 쌓는" 방식으로 통일 — 그러면 브라우저 뒤로가기가 항상 "그
  // 항목을 만들기 직전 화면"으로 정확히 돌아간다: 홈에서 왔으면 홈으로,
  // 이 페이지의 카드 목록(step1)에서 왔으면 그 목록으로.
  const locationState = location.state as { autoPersonaId?: string; selectedPersonaId?: string } | null
  const activePersonaId = locationState?.selectedPersonaId ?? locationState?.autoPersonaId ?? null

  useEffect(() => {
    setHelp(t('persona.help_title'), t('persona.help_body'))
    return () => clearHelp()
  }, [setHelp, clearHelp, t])

  // 카드 목록(step1)일 때만 투어를 띄운다 — 홈에서 카드를 눌러 결과 화면으로
  // 바로 들어온 경우(activePersonaId 있음)는 하이라이트할 그리드 자체가
  // 안 보이므로 대상이 아니다.
  useEffect(() => {
    if (!activePersonaId && canAutoStartTour(PERSONA_TOUR_KEY)) startTour(PERSONA_TOUR_KEY)
  }, [activePersonaId, startTour])

  const personasQuery = useQuery({
    queryKey: ['k-content-personas', locale],
    queryFn: () => fetchKContentPersonas(locale),
  })

  const activePersona = personasQuery.data?.find((p) => p.id === activePersonaId) ?? null
  const personaNotFound = Boolean(activePersonaId) && Boolean(personasQuery.data) && !activePersona

  const routeQuery = useQuery({
    queryKey: ['k-content-persona-route', activePersonaId, locale],
    queryFn: async () => {
      const persona = activePersona!
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
    enabled: Boolean(activePersonaId) && Boolean(activePersona),
  })

  useEffect(() => {
    if (routeQuery.data) toast.success(t('persona.route_generated'))
  }, [routeQuery.data, t])

  function selectPersona(persona: KContentPersona) {
    // 같은 경로(/persona)에 새 state로 push — 브라우저 뒤로가기가 이 카드
    // 목록(step1)으로 정확히 돌아오게 하는 핵심.
    navigate('.', { state: { selectedPersonaId: persona.id } })
  }

  // "다른 루트 만들기" 버튼 = 브라우저 뒤로가기와 완전히 동일한 동작으로
  // 통일 — 홈에서 왔으면 홈으로, 이 페이지 카드 목록에서 왔으면 그
  // 목록으로, 어느 경로로 들어왔든 항상 "그 직전 화면"으로 돌아간다.
  function reset() {
    navigate(-1)
  }

  // 팀 태스크보드 — 페르소나 step2에서 스팟별로 추가/제거를 골랐다면(route-result.tsx의
  // excludedIds, 이 페이지엔 저장 안 됨) 그 결과로 걸러진 stops만 넘어온다.
  // savePersonaRoutePlan(plan)은 원본 전체 계획 그대로 저장 — 도슨트 등 다른
  // 기능이 참조하는 "이 루트가 어느 페르소나의 어떤 계획이었는지" 원본 기록이라
  // 선별 여부와 무관하게 보존한다.
  function handleAddToRoute(stops: RoutePlan['stops']) {
    const plan = routeQuery.data
    if (!plan) return
    savePersonaRoutePlan(plan)
    const ts = Date.now()
    const { addedCount } = addStopsToRouteDraft(
      stops.map((s) => ({ ...s, id: `${s.id}-${ts}`, placeId: s.id, fromPersona: true })),
    )
    toast.success(addedCount > 0 ? t('persona.route_saved') : t('common.already_in_route'))
    navigate('../route')
  }

  if (activePersonaId) {
    if (routeQuery.data) {
      return (
        <div className="mx-auto w-full space-y-4 px-4 py-4 md:max-w-2xl">
          <RouteResult plan={routeQuery.data} onReset={reset} onAddToRoute={handleAddToRoute} />
        </div>
      )
    }

    if (routeQuery.isError || personaNotFound) {
      return (
        <div className="mx-auto flex min-h-full w-full flex-col items-center justify-center gap-3 px-4 py-10 text-center md:max-w-2xl">
          <p className="text-sm font-semibold text-destructive">{t('persona.error_title')}</p>
          <Button
            variant="destructive"
            size="sm"
            disabled={!activePersona || routeQuery.isFetching}
            onClick={() => routeQuery.refetch()}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t('persona.retry')}
          </Button>
        </div>
      )
    }

    // personasQuery 로딩 중이거나(activePersona 확정 전) routeQuery 생성 중 —
    // 둘 다 같은 전체화면 스피너로 보여준다.
    return (
      <div className="mx-auto flex min-h-full w-full flex-col items-center justify-center gap-3 px-4 py-10 text-center md:max-w-2xl">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        <p className="text-sm text-muted-foreground">{t('persona.generating')}</p>
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
              (personasQuery.data ?? []).map((persona, index) => (
                <button
                  key={persona.id}
                  type="button"
                  // 투어 1단계는 카드 전체가 아니라 첫 번째 카드만 하이라이트한다
                  // — 그리드 전체를 누를 수 있게 두면 어디를 눌러야 할지 애매해서
                  // 안 눌러보고 넘어간다는 피드백(사용자 요청). 이름 대신
                  // "첫 번째로 렌더링되는 카드"로 타겟팅해서 정렬 순서가 바뀌어도
                  // 안전하다.
                  data-tour={index === 0 ? 'persona-grid' : undefined}
                  onClick={() => selectPersona(persona)}
                  className={cn(
                    "overflow-hidden rounded-xl border text-left transition-all md:rounded-2xl",
                    "border-border bg-background hover:border-primary/60 hover:bg-primary/10",
                  )}
                >
                  <div className="aspect-square w-full bg-muted">
                    <PersonaCardImage persona={persona} disableZoom={index === 0 && firstCardZoomDisabled} />
                  </div>
                  <div className="space-y-0.5 p-2 md:space-y-1 md:p-3">
                    <p className="truncate text-xs font-semibold text-foreground md:text-sm">
                      {persona.label}
                    </p>
                    <span className="inline-block rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground md:px-2 md:text-[10px]">
                      {persona.routeCnt}
                      {t("persona.stops_suffix")}
                    </span>
                    <MarqueeText
                      text={persona.description}
                      className="text-[10px] leading-4 text-muted-foreground md:text-xs md:leading-5"
                    />
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
