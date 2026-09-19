import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { renderStepText } from '@/lib/step-text'
import { cn } from '@/lib/utils'
import mapGif from '@/assets/route-guide/route-guide-map.gif'
import analyzeGif from '@/assets/route-guide/route-guide-analyze.gif'
import personaGif from '@/assets/route-guide/route-guide-persona.gif'

// 2026-09: "내 루트"가 비어있을 때 안내 문구("아직 루트가 없어요...")만 있고
// 그 아래가 텅 비어있어서, 처음 온 사용자는 "그래서 뭘 눌러야 하지?" 싶을 수
// 있다는 피드백 — 장소를 실제로 추가하는 3가지 진입점(지도/SNS 분석기/
// 페르소나)마다 짧은 단계별 안내를 붙였다.
//
// 탭 형태로 만든 이유(사용자 피드백: "현재 상태라면 너무 길게 보이는데") —
// 3개를 전부 세로로 나열하면(특히 GIF까지 들어가면) 화면이 너무 길어져서,
// 한 번에 하나의 방법만 보여주고 나머지는 탭으로 전환하게 했다. 어떤 탭을
// 보든 페이지 높이가 크게 안 바뀌어서 레이아웃도 안정적이다.
//
// 2026-09: 단계별 정지 캡처 3장을 SNS 분석기의 "이렇게 사용해요"와 같은
// 형태(실제 클릭 액션이 담긴 GIF 1개 + 그 아래 번호 매긴 줄글 설명)로
// 통일했다(사용자 요청) — GIF 자체가 각 단계에서 무엇을 눌러야 하는지
// 하이라이트 링 + 커서 클릭 동작으로 보여주므로, 정지 이미지를 단계마다
// 끼워 넣을 필요가 없어졌다.
//
// 2026-09: 3개 GIF(route-guide-*.gif)를 사용자가 직접 캡처한 화면으로 다시
// 만들었다(가장자리 테두리 크롭, 420x928). 하이라이트 링/클릭 물결은 홈 배너와
// 같은 핑크~주황 그라데이션(rose-500 -> pink-500 -> orange-400)의 "테두리만"
// (채우기 없음)이다. 재생성 스크립트는 저장소에 없고 로컬 작업용이다.
//
// route-guide-analyze.gif의 예시 영상은 실제 유튜브 영상이 아니다 — 저작권
// 우려로 주소의 영상 ID를 가짜(xxxxxxxxxxx)로 바꿨고, 썸네일은 한국관광공사
// TourAPI의 "북촌한옥마을 감고당길"(contentId 2946075) 사진으로 교체했다.
// 이 사진은 공공누리 제1유형(출처표시, 상업적 이용/변경 가능)이라 출처 표시
// (출처: 한국관광공사)가 필요하다.
//
// 버튼 이름을 강조하는 방식(renderStepText)은 blocks/analyze/usage-tutorial.tsx의
// "이렇게 사용해요" 안내와 동일 — 번역 문자열 안에서 버튼 이름을 따옴표/대괄호로
// 감싸두면 자동으로 작은 버튼 모양 칩으로 렌더링된다.
interface GuideTab {
  key: string
  tabLabel: string
  panelLabel: string
  steps: string[]
  gif: string
  gifAlt: string
  // 안내 카드 맨 아래 오른쪽에 작게 붙이는 한 줄 출처 표기 — GIF 안에 들어간 사진의
  // 라이선스(공공누리 제1유형: 출처표시)가 요구하는 것. 사진이 없는 탭은 생략.
  credit?: string
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
      gif: mapGif,
      gifAlt: t('route.empty_guide_map_label'),
    },
    {
      key: 'analyze',
      tabLabel: t('analyze.nav_title'),
      panelLabel: t('route.empty_guide_analyze_label'),
      steps: t('route.empty_guide_analyze_steps', { returnObjects: true }) as string[],
      gif: analyzeGif,
      gifAlt: t('route.empty_guide_analyze_label'),
      credit: t('route.empty_guide_analyze_credit'),
    },
    {
      key: 'persona',
      tabLabel: t('persona.nav_title'),
      panelLabel: t('route.empty_guide_persona_label'),
      steps: t('route.empty_guide_persona_steps', { returnObjects: true }) as string[],
      gif: personaGif,
      gifAlt: t('route.empty_guide_persona_label'),
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

        <div className="mx-auto max-w-[240px] overflow-hidden rounded-lg border border-border shadow-sm">
          <img key={active.key} src={active.gif} alt={active.gifAlt} className="w-full" />
        </div>

        <ol className="mt-3 space-y-1.5">
          {active.steps.map((step, idx) => (
            <li key={idx} className="flex gap-1.5 text-xs leading-5 text-muted-foreground md:text-sm">
              <span className="shrink-0 font-semibold text-primary">{idx + 1}.</span>
              <span>{renderStepText(step)}</span>
            </li>
          ))}
        </ol>

        {/* 사진 출처는 이미지 바로 밑이 아니라 안내 카드 맨 아래 오른쪽에 한 줄로만 둔다(사용자
            요청 — 이미지 밑에 붙이면 지저분하다). 사진이 실제로 보이는 이 카드 안이라 사진과
            같은 화면에서 출처가 보인다. */}
        {active.credit && <p className="mt-2 text-right text-[11px] leading-4 text-muted-foreground">{active.credit}</p>}
      </div>
    </div>
  )
}
