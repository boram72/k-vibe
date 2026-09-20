import { useTranslation } from 'react-i18next'
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
// 2026-09: 두 GIF를 현재 화면(이 페이지에 "이렇게 사용해요" 버튼/인기 영상
// 목록이 생긴 뒤)으로 다시 만들었다(사용자 요청). 실제 앱 화면(idle -> URL 입력 ->
// 분석 중 -> 결과 -> 선택 팝업, 5장)을 깨끗하게 캡처한 뒤 그 위에 하이라이트/
// 커서/클릭 물결을 따로 그려 넣었다 — 내 루트 빈 화면의 "이렇게 추가해보세요"
// GIF(route-guide-*.gif)와 같은 핑크~주황 그라데이션 테두리(채우기 없음) + 오른쪽
// 아래에서 미끄러져 들어와 누르는 커서 동작이다. 재생성 스크립트는 저장소에
// 없고 로컬 작업용이다.
//
// GIF 속 예시 URL은 실제 영상이 아니다 — 저작권 우려로 영상 ID를 가짜
// (youtube.com/shorts/xxxxxxxxxxx)로 바꿨고(썸네일 왼쪽 아래 라벨은 앱이 영상 ID를
// 보여주는 자리라 "youtube.com/shorts"로 표기), 썸네일은 저작권 무료 사진(Pixabay
// License)에 글자를 얹어 직접 만든 이미지다. 실제 유튜브 썸네일이 들어 있는
// "이 유튜브를 많이 검색해요" 목록은 GIF에서 숨겼다. GIF 자체는 로컬 mock
// 응답으로 찍은 화면이라 실제 백엔드/AI 호출은 전혀 없었다.
// 버튼 이름을 가리키는 부분을 실제 버튼처럼 보이는 작은 테두리 박스로 보여준다
// (사용자 피드백: "버튼임을 확인할 수 있게 네모 박스 안이라던가"). 렌더링
// 로직(renderStepText/ButtonChip)은 blocks/route의 "내 루트 비어있을 때"
// 안내에서도 똑같이 써서 @/lib/step-text.tsx로 공용화했다 — 자세한 이유는
// 그 파일 주석 참고.
// 2026-09: 원래 idle 화면에 항상 보이는 인라인 블록이었는데, 코치마크 투어와
// 내용이 거의 겹쳐서(둘 다 "이렇게 쓰세요" 안내) 페이지가 길어지기만
// 했다(사용자 피드백) — 버튼 + 팝업(Dialog)으로 옮기고, 팝업 자체 제목은
// 그 Dialog가 맡으므로 이 컴포넌트는 GIF와 단계 목록만 그린다.
export function UsageTutorial() {
  const { t } = useTranslation()

  const steps = [t('analyze.tutorial_step1'), t('analyze.tutorial_step2'), t('analyze.tutorial_step3'), t('analyze.tutorial_step4')]

  return (
    // data-testid: 이 GIF를 다시 찍을 때(scripts/record_gif.js, 저장소엔 없고
    // 로컬 녹화용) 이 블록 자체를 화면에서 지우고 찍는 데 쓴다 -- 안 지우면
    // GIF 안에 이 GIF 미리보기가 또 보이고 그 안에 또 보이고... 식으로
    // 화면 속 화면이 계속 중첩돼서 첫 장면이 정신없어 보인다(사용자 피드백).
    <div data-testid="usage-tutorial">
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
