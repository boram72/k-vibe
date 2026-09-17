import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { renderStepText } from '@/lib/step-text'
import { cn } from '@/lib/utils'
import mapStep1 from '@/assets/route-guide/map-step1.png'
import mapStep2 from '@/assets/route-guide/map-step2.png'
import mapStep3 from '@/assets/route-guide/map-step3.png'
import analyzeStep1 from '@/assets/route-guide/analyze-step1.png'
import analyzeStep2 from '@/assets/route-guide/analyze-step2.png'
import analyzeStep3 from '@/assets/route-guide/analyze-step3.png'
import personaStep1 from '@/assets/route-guide/persona-step1.png'
import personaStep2 from '@/assets/route-guide/persona-step2.png'
import personaStep3 from '@/assets/route-guide/persona-step3.png'

// 2026-09: "내 루트"가 비어있을 때 안내 문구("아직 루트가 없어요...")만 있고
// 그 아래가 텅 비어있어서, 처음 온 사용자는 "그래서 뭘 눌러야 하지?" 싶을 수
// 있다는 피드백 — 장소를 실제로 추가하는 3가지 진입점(지도/SNS 분석기/
// 페르소나)마다 짧은 단계별 안내를 붙였다.
//
// 탭 형태로 만든 이유(사용자 피드백: "현재 상태라면 너무 길게 보이는데") —
// 3개를 전부 세로로 나열하면(특히 캡처 이미지까지 들어가면) 화면이 너무
// 길어져서, 한 번에 하나의 방법만 보여주고 나머지는 탭으로 전환하게 했다.
// 어떤 탭을 보든 페이지 높이가 크게 안 바뀌어서 레이아웃도 안정적이다.
//
// 버튼 이름을 강조하는 방식(renderStepText)은 blocks/analyze/usage-tutorial.tsx의
// "이렇게 사용해요" 안내와 동일 — 번역 문자열 안에서 버튼 이름을 따옴표/대괄호로
// 감싸두면 자동으로 작은 버튼 모양 칩으로 렌더링된다.
interface GuideTab {
  key: string
  tabLabel: string
  panelLabel: string
  steps: string[]
  images?: string[]
}

export function EmptyRouteGuide() {
  const { t } = useTranslation()
  const [activeKey, setActiveKey] = useState('map')

  const tabs: GuideTab[] = [
    {
      key: 'map',
      tabLabel: t('map.title'),
      panelLabel: t('route.empty_guide_map_label'),
      steps: t('route.empty_guide_map_steps', { returnObjects: true }) as string[],
      images: [mapStep1, mapStep2, mapStep3],
    },
    {
      key: 'analyze',
      tabLabel: t('analyze.nav_title'),
      panelLabel: t('route.empty_guide_analyze_label'),
      steps: t('route.empty_guide_analyze_steps', { returnObjects: true }) as string[],
      images: [analyzeStep1, analyzeStep2, analyzeStep3],
    },
    {
      key: 'persona',
      tabLabel: t('persona.nav_title'),
      panelLabel: t('route.empty_guide_persona_label'),
      steps: t('route.empty_guide_persona_steps', { returnObjects: true }) as string[],
      images: [personaStep1, personaStep2, personaStep3],
    },
  ]
  const active = tabs.find((tab) => tab.key === activeKey) ?? tabs[0]

  return (
    <div className="mx-auto mt-6 w-full max-w-md text-left md:max-w-xl">
      <p className="mb-2 text-center text-xs font-semibold text-foreground/80 md:text-sm">{t('route.empty_guide_title')}</p>

      <div className="flex gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveKey(tab.key)}
            className={cn(
              'flex-1 rounded-lg px-2 py-2 text-center text-[11px] font-semibold transition-colors md:py-2.5 md:text-sm',
              tab.key === activeKey ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.tabLabel}
          </button>
        ))}
      </div>

      <div className="mt-2 rounded-xl border border-border bg-muted p-3 md:p-4">
        <p className="mb-2 text-xs font-semibold text-foreground md:text-sm">{active.panelLabel}</p>
        <ol className="space-y-3">
          {active.steps.map((step, idx) => (
            <li key={idx} className="space-y-1.5 text-xs leading-5 text-muted-foreground md:text-sm">
              <div className="flex gap-1.5">
                <span className="shrink-0 font-semibold text-primary">{idx + 1}.</span>
                <span>{renderStepText(step)}</span>
              </div>
              {active.images?.[idx] && (
                <img src={active.images[idx]} alt="" className="mx-auto mt-1 w-56 rounded-lg border border-border shadow-sm md:w-72" />
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
