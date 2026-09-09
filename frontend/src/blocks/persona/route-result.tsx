import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, ImageOff, MapPin, Plus, RotateCcw, Share2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CrowdBadge } from '@/blocks/common/crowd-badge'
import { ZoomableImage } from '@/blocks/common/zoomable-image'
import { formatDuration, type RoutePlan, type RouteStop } from '@/lib/route-timing'

interface RouteResultProps {
  plan: RoutePlan
  onReset: () => void
  onAddToRoute: () => void
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
          { label: t('persona.stops'), value: String(plan.stops.length), icon: MapPin },
          { label: t('persona.walking'), value: formatDuration(plan.walkingMinutes), icon: Clock },
          { label: t('persona.total'), value: formatDuration(plan.totalMinutes), icon: Sparkles },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl bg-muted p-3 text-center">
            <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-primary" />
            <p className="text-sm font-bold text-foreground">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {plan.stops.map((stop, index) => (
          <div key={stop.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </div>
              {index < plan.stops.length - 1 && <div className="my-1 min-h-4 w-px flex-1 bg-border" />}
            </div>

            <div className="mb-1 flex flex-1 gap-3 rounded-xl border border-border bg-muted p-3">
              <StopCharacterImage stop={stop} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-semibold text-foreground">{stop.name}</p>
                  <CrowdBadge level={stop.crowdLevel} />
                  <span className="ml-auto text-xs font-semibold text-primary">{stop.startTime}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{stop.address}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground/90">{stop.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={onAddToRoute}>
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
