import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTourStore, canAutoStartTour, markTourSeen, resolveVisit, optOutOfTours } from '@/store/tour-store'
import { HOME_TOUR_KEY } from './tour-steps'

// 2026-09 팀 리뷰(PR #100 코멘트) — 처음엔 튜토리얼 전에 언어부터 고르게
// 했었는데, 이미 브라우저/OS 언어로 자동 세팅되고 이후 변경도 기억되므로
// (상단 언어 드롭다운으로 충분) 별도 언어 선택 단계는 빼고 "둘러볼까요?"
// 확인만 남긴다 — 언어는 그 시점에 이미 적용돼 있는 언어를 그대로 쓴다.
//
// 2026-09 튜토리얼 흐름 개편 — 예전엔 이 창을 "봤는지"를 별도 플래그
// (welcome-seen)로 따로 관리했는데, 그러면 "시작"을 누르고 실제 투어는
// 끝까지 안 본 채 이탈한 경우에도 다음 접속에서 이 창이 다시 안 뜨는
// 문제가 있었다(사용자 요청 — "닫기/다시보지않기 둘 다 안 누르고 이탈하면
// 다음 접속도 첫 방문으로 취급"). 그래서 이 창 자체를 홈 투어의 일부로
// 보고, canAutoStartTour(HOME_TOUR_KEY) 하나로 재노출 여부를 판단한다 —
// 실제로 끝까지 보거나(완료) 명시적으로 닫거나(닫기/다시보지않기) 해야만
// "봤음"으로 표시된다.
//
// localStorage 읽기는 마운트 시점에 딱 한 번만 필요해서(이후엔 이 컴포넌트
// 내부 state로만 열림/닫힘을 관리) useState의 lazy initializer로 계산한다 —
// useEffect + setState로 하면 첫 렌더는 무조건 닫힌 상태로 한 번 그려졌다가
// 바로 다음 렌더에서 바뀌는 깜빡임이 생긴다.
function initialOpen(): boolean {
  return canAutoStartTour(HOME_TOUR_KEY)
}

export function WelcomeGate() {
  const { t } = useTranslation()
  const startTour = useTourStore((s) => s.start)
  const [open, setOpen] = useState<boolean>(initialOpen)

  // 'start': 투어 시작 — 아직 "봤음"으로 표시하지 않는다. 홈 투어 자체가
  //   끝날 때(완료/닫기/다시보지않기, tour-overlay.tsx 참고)가 진짜 종료
  //   시점이라 그때 tour-store가 표시한다. 여기서 미리 표시해버리면 투어를
  //   끝까지 안 본 채 이탈했을 때도 "봤음"으로 남아 다음 접속에서 재시도가
  //   안 된다.
  // 'close': 오버레이 바깥 클릭/Esc로 닫음 — 이번 방문 안에서는 다른 메뉴의
  //   첫 진입 투어가 계속 뜨고, 다음 접속부터만 전체가 꺼진다.
  // 'optout': "다시 보지 않기" — 이번 방문 중 남은 다른 메뉴 투어도 즉시 다
  //   끄고, 다음 접속부터도 영구히 안 뜨게 한다.
  function finish(action: 'start' | 'close' | 'optout') {
    setOpen(false)
    if (action === 'start') {
      startTour(HOME_TOUR_KEY)
    } else if (action === 'optout') {
      markTourSeen(HOME_TOUR_KEY)
      optOutOfTours()
    } else {
      markTourSeen(HOME_TOUR_KEY)
      resolveVisit()
    }
  }

  if (!open) return null

  return (
    <Dialog open onOpenChange={(next) => !next && finish('close')}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">{t('welcome.title')}</DialogTitle>
          <DialogDescription className="text-center">{t('welcome.tour_prompt')}</DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-2">
          <Button onClick={() => finish('start')}>{t('welcome.start_tour')}</Button>
          <Button variant="ghost" onClick={() => finish('optout')}>
            {t('welcome.skip')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
