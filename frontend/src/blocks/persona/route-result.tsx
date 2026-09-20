import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageOff, MapPin, Plus, RotateCcw, Route, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CrowdBadge } from '@/blocks/common/crowd-badge'
import { ZoomableImage } from '@/blocks/common/zoomable-image'
import { haversineKm } from '@/lib/haversine'
import type { RoutePlan, RouteStop } from '@/lib/route-timing'
import { cn } from '@/lib/utils'

function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`
}

// 0점대(빨강)~5점대(초록) 단계별 그라데이션. 인덱스 = Math.floor(rating),
// 5.0은 배열 끝(초록)까지 그대로 써서 별도 분기 없이 클램프만 하면 됨.
const RATING_COLOR_STEPS = [
  'text-red-600',
  'text-red-500',
  'text-orange-500',
  'text-amber-500',
  'text-lime-500',
  'text-emerald-500',
]

function ratingTextClass(rating: number): string {
  const step = Math.min(RATING_COLOR_STEPS.length - 1, Math.max(0, Math.floor(rating)))
  return RATING_COLOR_STEPS[step]
}

function totalRouteDistanceM(stops: RouteStop[]): number {
  let total = 0
  for (let i = 0; i < stops.length - 1; i++) {
    total += haversineKm(stops[i].lat, stops[i].lng, stops[i + 1].lat, stops[i + 1].lng) * 1000
  }
  return total
}

interface RouteResultProps {
  plan: RoutePlan
  onReset: () => void
  // 팀 태스크보드 — 페르소나 방문 루트 중 필요한 스팟만 선별해서 내 루트에
  // 추가할 수 있도록, 이 화면에서 고른 스팟 목록을 인자로 넘긴다(DB/localStorage
  // 저장 없는 화면 로컬 state — 아래 excludedIds 참고).
  onAddToRoute: (stops: RouteStop[]) => void
  // 대화 중 요청 — RouteStopCard(내 루트)의 지도 아이콘 버튼과 동일한 자리/
  // 룩으로, 이 스팟 하나를 지도에서 보여준다(필터+상세팝업+돌아가기 버튼은
  // PersonaPage.viewStopOnMap이 구성).
  onViewOnMap: (stop: RouteStop) => void
  // 대화 중 요청 — SNS 분석기의 "지도에서 모두 보기"(전체 focusPlaces 핸드오프)와
  // 동일하게, 이 페르소나의 방문지 전체를 지도의 "페르소나별 탭"으로 보여준다
  // (PersonaPage.viewAllOnMap이 initialFilterMode/initialStarFilter만 실어
  // 보냄 — 개별 스팟용 onViewOnMap과 달리 특정 스팟 핀 강조는 없음).
  onViewAllOnMap: () => void
}

// stop.characterImageUrl은 실제 스타 초상권 대신 "이 장소의 무드"를 전달하는
// 생성형 캐릭터 이미지 — 아직 이미지 생성 파이프라인(GEMINI_API_KEY/OPENAI_API_KEY)이
// 연동 전이라 항상 비어있다. 값이 없거나 로드에 실패하면(onError) 자리 자체가
// 사라지던 것을, 이미지가 들어올 자리라는 걸 알 수 있도록 빈 이미지 아이콘
// 플레이스홀더로 항상 표시하도록 변경(2026-09, 사용자 요청). 이미지가 있을 때는
// 64px로 작게 보여서 잘 안 보이므로 ZoomableImage로 감싸 클릭 시 팝업으로 크게
// 볼 수 있게 한다(PR #23).
// characterImageUrl이 비어있는 동안은(현재 전부 비어있음) stop.imageUrl(location
// 테이블의 실제 장소 사진)을 대신 보여준다 — 캐릭터 이미지가 채워지면 그쪽이 우선.
function StopCharacterImage({ stop }: { stop: RouteStop }) {
  const { t } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)
  const src = stop.characterImageUrl || stop.imageUrl

  if (src && !imageFailed) {
    return (
      <ZoomableImage
        src={src}
        alt={stop.name}
        onError={() => setImageFailed(true)}
        className="h-16 w-16 shrink-0 rounded-lg object-cover"
      />
    )
  }

  return (
    <div
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground/40"
      title={t('persona.character_image_pending')}
    >
      <ImageOff className="h-6 w-6" />
    </div>
  )
}

export function RouteResult({ plan, onReset, onAddToRoute, onViewOnMap, onViewAllOnMap }: RouteResultProps) {
  const { t } = useTranslation()
  // 페르소나 step2 스팟 추가/제거 — DB/localStorage 저장 없이 이 화면에서만
  // 사는 단발성 선택 상태. plan(prop)이 바뀌면(다른 페르소나 선택/재생성) 이
  // 컴포넌트 자체가 새 plan으로 리마운트되는 게 아니라 값만 갱신되므로, 진짜
  // "다른 페이지 갔다 돌아오면 리셋"은 PersonaPage 쪽에서 plan을 null로
  // 되돌렸다가 다시 채우는 것으로 보장된다(RouteResult는 plan이 있을 때만
  // 렌더링됨 — PersonaPage.tsx 참고). 원본 plan.stops는 건드리지 않고 "제외된
  // id" 집합만 들고 있다가 필요한 곳에서 걸러 쓴다.
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set())

  function toggleStop(id: string) {
    setExcludedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const includedStops = plan.stops.filter((stop) => !excludedIds.has(stop.id))
  // 선별 후 남은 스팟들만 기준으로 총 거리를 다시 계산(제외된 스팟 사이는
  // 건너뛰고 남은 스팟끼리 바로 연결된다고 가정) — 원래 전체 루트 기준
  // 거리를 그대로 보여주면 몇 곳을 뺐는데도 숫자가 안 바뀌어 혼란스러움.
  const includedDistanceM = totalRouteDistanceM(includedStops)

  function handleAddToRoute() {
    if (includedStops.length === 0) {
      toast.error(t('persona.no_stops_selected'))
      return
    }
    onAddToRoute(includedStops)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary">{t('persona.preview_eyebrow')}</p>
          <h2 className="mt-0.5 text-lg font-bold text-foreground">{plan.title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{plan.summary}</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          aria-label={t('persona.create_another')}
          title={t('persona.create_another')}
          className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: t('persona.stops'), value: String(includedStops.length) },
          { label: t('persona.total_distance'), value: formatDistance(includedDistanceM) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-muted p-3 text-center">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className="text-sm font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {plan.stops.map((stop, index) => {
          const isExcluded = excludedIds.has(stop.id)
          return (
            <div key={stop.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-primary-foreground',
                    isExcluded ? 'bg-muted-foreground/40' : 'bg-primary',
                  )}
                >
                  {index + 1}
                </div>
                {index < plan.stops.length - 1 && <div className="my-1 min-h-4 w-px flex-1 bg-border" />}
              </div>

              <div
                className={cn(
                  'mb-1 flex flex-1 gap-3 rounded-xl border p-3',
                  isExcluded ? 'border-dashed border-border bg-muted/40' : 'border-crowd-low/30 bg-crowd-low/5',
                )}
              >
                <div className={cn('flex min-w-0 flex-1 gap-3', isExcluded && 'opacity-50')}>
                  <StopCharacterImage stop={stop} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className={cn('text-sm font-semibold text-foreground', isExcluded && 'line-through')}>
                        {stop.name}
                      </p>
                      <CrowdBadge level={stop.crowdLevel} />
                      {typeof stop.rating === 'number' && (
                        <span
                          className={cn(
                            'inline-flex items-center gap-0.5 text-xs font-semibold',
                            ratingTextClass(stop.rating),
                          )}
                        >
                          <Star className="h-3 w-3 fill-current" />
                          {stop.rating.toFixed(1)}
                        </span>
                      )}
                      {isExcluded && (
                        <span className="rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {t('persona.stop_excluded')}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {stop.address === '-' ? t('placeDetail.info_unavailable') : stop.address}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground/90">{stop.description}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-start gap-1 self-start">
                  {/* 대화 중 요청 — RouteStopCard(내 루트)의 지도 아이콘
                      버튼과 동일한 자리/룩(MapPin, rounded-lg p-1.5). */}
                  <button
                    type="button"
                    onClick={() => onViewOnMap(stop)}
                    aria-label={t('persona.view_stop_on_map', { name: stop.name })}
                    title={t('persona.view_stop_on_map', { name: stop.name })}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent"
                  >
                    <MapPin className="h-4 w-4" />
                  </button>
                  {/* 대화 중 요청 — SNS 분석기(analysis-result-list.tsx)의
                      "선택"/"추가됨" 알약형 버튼과 동일한 룩으로 통일.
                      아이콘은 X(선택해제)/+(선택) 그대로 유지. 초록색은
                      RoutePage(route-stop-card.tsx)의 "완료" 표기와 동일한
                      crowd-low 토큰으로 통일(테두리·버튼 fill 둘 다) —
                      임의의 emerald-500 대신 이미 있는 시맨틱 색상 재사용. */}
                  <button
                    type="button"
                    data-tour="persona-exclude"
                    className={cn(
                      'flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors',
                      isExcluded ? 'bg-crowd-low text-white' : 'bg-border text-foreground',
                    )}
                    onClick={() => toggleStop(stop.id)}
                    aria-label={isExcluded ? t('persona.include_stop') : t('persona.exclude_stop')}
                    title={isExcluded ? t('persona.include_stop') : t('persona.exclude_stop')}
                  >
                    {isExcluded ? <Plus className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {isExcluded ? t('persona.include_stop') : t('persona.exclude_stop')}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 대화 중 요청 — SNS 분석기 하단 액션바(grid-cols-2: "지도에서 모두
          보기" outline + "루트에 모두 추가" 채움)와 동일한 배치/아이콘/문구로
          통일. "지도에서 모두 보기"는 PersonaPage.viewAllOnMap이 이미 있는
          "페르소나별 탭"(filterMode: 'star')을 이 페르소나 라벨로 열어준다
          (새 핸드오프 없음). 제외된 스팟이 하나라도 있으면(전체가 아니라
          일부만 담기는 상태) "루트에 모두 추가"쪽 문구만 "선택 항목만
          루트에 추가"로 바뀐다 — excludedIds는 이미 있는 state라 새로
          만들 것 없이 그 크기만 참조. */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onViewAllOnMap}>
          <MapPin className="h-3.5 w-3.5" />
          {t('persona.view_all_on_map')}
        </Button>
        <Button onClick={handleAddToRoute} disabled={includedStops.length === 0}>
          <Route className="h-3.5 w-3.5" />
          {excludedIds.size > 0 ? t('persona.add_selected_to_route') : t('persona.add_all_to_route')}
        </Button>
      </div>
    </div>
  )
}
