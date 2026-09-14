import { useTranslation } from 'react-i18next'
import { PlayCircle } from 'lucide-react'
import tutorialGif from '@/assets/analyze-tutorial/how-to-use.gif'

// 2026-09: 아직 아무 분석도 안 해본 사용자를 위해 idle 상태(안내 카드 아래,
// 그 전엔 비어있던 공간)에 넣는 간단한 사용법 GIF(사용자 요청). URL 붙여넣기
// -> 분석 진행 -> 결과 확인 -> 장소 선택까지 흐름을 보여준다.
//
// GIF 자체가 이 페이지를 그대로 녹화한 화면이라, 실제 idle 화면 바로 아래
// 놓으면 자칫 "같은 화면이 아래에 또 있는" 것처럼 보일 수 있다 — 그래서 위에
// 재생 아이콘 + 라벨을 먼저 두고, 안쪽은 살짝 인셋(패딩+테두리)을 줘서 실제
// 카드가 아니라 "미리보기 영상"이라는 걸 한눈에 구분되게 했다.
//
// GIF 속 예시 URL은 실제 유튜브 영상(Perseverance 화성 착륙 - 미국 항공우주국
// 공식 채널 업로드)이지만, 저작권 문제를 피하기 위해 일부러 저작권 없는
// 영상을 골랐다: 미국 연방정부 저작물은 17 U.S.C. §105에 따라 퍼블릭
// 도메인이라 화면에 썸네일이 노출돼도 문제가 없다(사용자 요청: "유튜브에서
// 저작권 걸릴 수 있으니 저작권 없는 영상으로 해줘"). GIF 자체는 로컬 mock
// 응답으로 찍은 화면이라 실제 백엔드/AI 호출은 전혀 없었다.
export function UsageTutorial() {
  const { t } = useTranslation()

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <PlayCircle className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-semibold text-foreground/80">{t('analyze.tutorial_title')}</p>
      </div>
      <div className="mx-auto max-w-[280px] overflow-hidden rounded-lg border border-border shadow-sm">
        <img src={tutorialGif} alt={t('analyze.tutorial_gif_alt')} className="w-full" />
      </div>
    </div>
  )
}
