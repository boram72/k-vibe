import { useTranslation } from 'react-i18next'
import { PlayCircle } from 'lucide-react'
import tutorialGifMobile from '@/assets/analyze-tutorial/how-to-use.gif'
import tutorialGifDesktop from '@/assets/analyze-tutorial/how-to-use-desktop.gif'
import { renderStepText } from '@/lib/step-text'

// 2026-09: 아직 아무 분석도 안 해본 사용자를 위해 idle 상태(안내 카드 아래,
// 그 전엔 비어있던 공간)에 넣는 간단한 사용법 GIF(사용자 요청). URL 붙여넣기
// -> 분석 진행 -> 결과 확인 -> 장소 선택까지 흐름을 보여준다.
//
// GIF 자체가 이 페이지를 그대로 녹화한 화면이라, idle 화면 바로 아래 놓으면
// 자칫 "같은 화면이 아래에 또 있는" 것처럼 보일 수 있다 — 그래서 위에 재생
// 아이콘 + 라벨을 먼저 두고, 안쪽은 살짝 인셋(패딩+테두리)을 줘서 실제 카드가
// 아니라 "미리보기 영상"이라는 걸 한눈에 구분되게 했다.
//
// 모바일/데스크톱 두 해상도로 각각 녹화한 GIF를 따로 두고 CSS로 전환한다
// (사용자 피드백: "와이드 버전에서 첫 화면도 와이드 버전이어야 할 것 같아") —
// 데스크톱에서도 좁은 세로 화면 녹화본을 억지로 늘려 보여주면 실제 데스크톱
// 레이아웃과 안 맞아 어색하다. `hidden md:block`/`md:hidden`으로 전환하며,
// 미리보기 박스 최대 폭도 데스크톱에서 조금 더 넓힌다(md:max-w-sm).
//
// GIF 속 예시 URL은 실제 유튜브 영상(Perseverance 화성 착륙 - 미국 항공우주국
// 공식 채널 업로드)이지만, 저작권 문제를 피하기 위해 일부러 저작권 없는
// 영상을 골랐다: 미국 연방정부 저작물은 17 U.S.C. §105에 따라 퍼블릭
// 도메인이라 화면에 썸네일이 노출돼도 문제가 없다(사용자 요청: "유튜브에서
// 저작권 걸릴 수 있으니 저작권 없는 영상으로 해줘"). GIF 자체는 로컬 mock
// 응답으로 찍은 화면이라 실제 백엔드/AI 호출은 전혀 없었다.
// 버튼 이름을 가리키는 부분을 실제 버튼처럼 보이는 작은 테두리 박스로 보여준다
// (사용자 피드백: "버튼임을 확인할 수 있게 네모 박스 안이라던가"). 렌더링
// 로직(renderStepText/ButtonChip)은 blocks/route의 "내 루트 비어있을 때"
// 안내에서도 똑같이 써서 @/lib/step-text.tsx로 공용화했다 — 자세한 이유는
// 그 파일 주석 참고.
export function UsageTutorial() {
  const { t } = useTranslation()

  const steps = [t('analyze.tutorial_step1'), t('analyze.tutorial_step2'), t('analyze.tutorial_step3'), t('analyze.tutorial_step4')]

  return (
    // data-testid: 이 GIF를 다시 찍을 때(scripts/record_gif.js, 저장소엔 없고
    // 로컬 녹화용) 이 블록 자체를 화면에서 지우고 찍는 데 쓴다 -- 안 지우면
    // GIF 안에 이 GIF 미리보기가 또 보이고 그 안에 또 보이고... 식으로
    // 화면 속 화면이 계속 중첩돼서 첫 장면이 정신없어 보인다(사용자 피드백).
    <div data-testid="usage-tutorial" className="rounded-xl border border-primary/20 bg-primary/5 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <PlayCircle className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-semibold text-foreground/80">{t('analyze.tutorial_title')}</p>
      </div>
      <div className="mx-auto max-w-[280px] overflow-hidden rounded-lg border border-border shadow-sm md:hidden">
        <img src={tutorialGifMobile} alt={t('analyze.tutorial_gif_alt')} className="w-full" />
      </div>
      <div className="mx-auto hidden max-w-sm overflow-hidden rounded-lg border border-border shadow-sm md:block">
        <img src={tutorialGifDesktop} alt={t('analyze.tutorial_gif_alt')} className="w-full" />
      </div>

      <ol className="mt-3 space-y-1.5">
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
