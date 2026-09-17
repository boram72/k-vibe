import { useTranslation } from 'react-i18next'
import { MapPin, Sparkles, Video } from 'lucide-react'
import { renderStepText } from '@/lib/step-text'

// 2026-09: "내 루트"가 비어있을 때 안내 문구("아직 루트가 없어요...")만 있고
// 그 아래가 텅 비어있어서, 처음 온 사용자는 "그래서 뭘 눌러야 하지?" 싶을 수
// 있다는 피드백 — 장소를 실제로 추가하는 3가지 진입점(지도/SNS 분석기/
// 페르소나)마다 짧은 단계별 안내를 붙였다. 실제 화면 캡처+하이라이트 이미지는
// (a) 4개 언어마다 따로 찍어야 하고 (b) UI가 조금만 바뀌어도 다시 찍어야 해서
// 유지보수 부담이 커, 텍스트 기반으로만 구성했다(사용자 결정: "캡쳐 화면은
// 어렵지만 한글로 써진 줄글은 4개국어 잘 반영될 수 있도록").
//
// 버튼 이름을 강조하는 방식(renderStepText)은 blocks/analyze/usage-tutorial.tsx의
// "이렇게 사용해요" 안내와 동일 — 번역 문자열 안에서 버튼 이름을 따옴표/대괄호로
// 감싸두면 자동으로 작은 버튼 모양 칩으로 렌더링된다.
interface GuideSectionProps {
  icon: React.ReactNode
  label: string
  steps: string[]
}

function GuideSection({ icon, label, steps }: GuideSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-muted p-3 text-left">
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <p className="text-xs font-semibold text-foreground">{label}</p>
      </div>
      <ol className="space-y-1.5">
        {steps.map((step, idx) => (
          <li key={idx} className="flex gap-1.5 text-xs leading-5 text-muted-foreground">
            <span className="shrink-0 font-semibold text-primary">{idx + 1}.</span>
            <span>{renderStepText(step)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function EmptyRouteGuide() {
  const { t } = useTranslation()

  const mapSteps = t('route.empty_guide_map_steps', { returnObjects: true }) as string[]
  const analyzeSteps = t('route.empty_guide_analyze_steps', { returnObjects: true }) as string[]
  const personaSteps = t('route.empty_guide_persona_steps', { returnObjects: true }) as string[]

  return (
    <div className="mx-auto mt-6 w-full max-w-md space-y-3">
      <p className="text-center text-xs font-semibold text-foreground/80">{t('route.empty_guide_title')}</p>
      <GuideSection icon={<MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />} label={t('route.empty_guide_map_label')} steps={mapSteps} />
      <GuideSection icon={<Video className="h-3.5 w-3.5 shrink-0 text-primary" />} label={t('route.empty_guide_analyze_label')} steps={analyzeSteps} />
      <GuideSection icon={<Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />} label={t('route.empty_guide_persona_label')} steps={personaSteps} />
    </div>
  )
}
