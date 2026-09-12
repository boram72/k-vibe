import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, ImageOff, MapPin, Plus, RotateCcw, Share2, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CrowdBadge } from '@/blocks/common/crowd-badge'
import { ZoomableImage } from '@/blocks/common/zoomable-image'
import { totalRouteMinutes } from '@/lib/haversine'
import { formatDuration, type RoutePlan, type RouteStop } from '@/lib/route-timing'
import { cn } from '@/lib/utils'

interface RouteResultProps {
  plan: RoutePlan
  onReset: () => void
  // 팀 태스크보드 — 페르소나 방문 루트 중 필요한 스팟만 선별해서 내 루트에
  // 추가할 수 있도록, 이 화면에서 고른 스팟 목록을 인자로 넘긴다(DB/localStorage
  // 저장 없는 화면 로컬 state — 아래 excludedIds 참고).
  onAddToRoute: (stops: RouteStop[]) => void
  onShare: () => void
}

// stop.characterImageUrl은 실제 스타 초상권 대신 "이 장소의 무드"를 전달하는
// 생성형 캐릭터 이미지 — 아직 이미지 생성 파이프라인(GEMINI_API_KEY/OPENAI_API_KEY)이
// 연동 전이라 항상 비어있다. 값이 없거나 로드에 실패하면(onError) 자리 자체가
// 사라지던 것을, 이미지가 들어올 자리라는 걸 알 수 있도록 빈 이미지 아이콘
// 플레이스홀더로 항상 표시하도록 변경(2026-09, 사용자 요청). 이미지가 있을 때는
// 64px로 작게 보여서 잘 안 보이므로 ZoomableImage로 감싸 클릭 시 팝업으로 크게
// 볼 수 있게 한다(PR #23).
function StopCharacterImage({ stop }: { stop: RouteStop }) {
  const { t } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)

  if (stop.characterImageUrl && !imageFailed) {
    return (
      <ZoomableImage
        src={stop.characterImageUrl}
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

export function RouteResult({ plan, onReset, onAddToRoute, onShare }: RouteResultProps) {
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
  // 선별 후 남은 스팟들만 기준으로 도보시간을 다시 계산(제외된 스팟 사이는
  // 건너뛰고 남은 스팟끼리 바로 연결된다고 가정) — 원래 전체 루트 기준
  // walkingMinutes를 그대로 보여주면 몇 곳을 뺐는데도 숫자가 안 바뀌어 혼란스러움.
  const includedWalkingMinutes = totalRouteMinutes(includedStops)
  const includedStayMinutes = includedStops.reduce((sum, stop) => sum + stop.stayMinutes, 0)
  const includedTotalMinutes = includedWalkingMinutes + includedStayMinutes

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

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: t('persona.stops'), value: String(includedStops.length), icon: MapPin },
          { label: t('persona.walking'), value: formatDuration(includedWalkingMinutes), icon: Clock },
          { label: t('persona.total'), value: formatDuration(includedTotalMinutes), icon: Sparkles },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl bg-muted p-3 text-center">
            <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-primary" />
            <p className="text-sm font-bold text-foreground">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
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
                  isExcluded ? 'border-dashed border-border bg-muted/40' : 'border-border bg-muted',
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
                      {isExcluded && (
                        <span className="rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {t('persona.stop_excluded')}
                        </span>
                      )}
                      <span className="ml-auto text-xs font-semibold text-primary">{stop.startTime}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{stop.address}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground/90">{stop.description}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className={cn(
                    'h-5 w-5 shrink-0 self-start rounded-full',
                    isExcluded
                      ? 'text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500'
                      : 'text-destructive hover:bg-destructive/10 hover:text-destructive',
                  )}
                  onClick={() => toggleStop(stop.id)}
                  aria-label={isExcluded ? t('persona.include_stop') : t('persona.exclude_stop')}
                  title={isExcluded ? t('persona.include_stop') : t('persona.exclude_stop')}
                >
                  {isExcluded ? <Plus className="h-3 w-3" /> : <X className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={handleAddToRoute} disabled={includedStops.length === 0}>
          <Plus className="h-3.5 w-3.5" />
          {t('persona.add_to_route')}
        </Button>
        <Button variant="outline" onClick={onShare}>
          <Share2 className="h-3.5 w-3.5" />
          {t('persona.share')}
        </Button>
      </div>
    </div>
  )
}
