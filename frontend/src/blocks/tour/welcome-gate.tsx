import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTourStore, hasSeenTour } from '@/store/tour-store'
import { HOME_TOUR_KEY } from './tour-steps'

const WELCOME_SEEN_KEY = 'k-vibe-welcome-seen'

function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(WELCOME_SEEN_KEY) === '1'
  } catch {
    return true
  }
}

function markWelcomeSeen() {
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, '1')
  } catch {
    // no-op
  }
}

// 2026-09 팀 리뷰(PR #100 코멘트) — 처음엔 튜토리얼 전에 언어부터 고르게
// 했었는데, 이미 브라우저/OS 언어로 자동 세팅되고 이후 변경도 기억되므로
// (상단 언어 드롭다운으로 충분) 별도 언어 선택 단계는 빼고 "둘러볼까요?"
// 확인만 남긴다 — 언어는 그 시점에 이미 적용돼 있는 언어를 그대로 쓴다.
//
// localStorage 읽기는 마운트 시점에 딱 한 번만 필요해서(이후엔 이 컴포넌트
// 내부 state로만 열림/닫힘을 관리) useState의 lazy initializer로 계산한다 —
// useEffect + setState로 하면 첫 렌더는 무조건 닫힌 상태로 한 번 그려졌다가
// 바로 다음 렌더에서 바뀌는 깜빡임이 생긴다.
function initialOpen(): boolean {
  return !hasSeenWelcome() && !hasSeenTour(HOME_TOUR_KEY)
}

export function WelcomeGate() {
  const { t } = useTranslation()
  const startTour = useTourStore((s) => s.start)
  const [open, setOpen] = useState<boolean>(initialOpen)

  function finish(startTourNow: boolean) {
    markWelcomeSeen()
    setOpen(false)
    if (startTourNow) startTour(HOME_TOUR_KEY)
  }

  if (!open) return null

  return (
    <Dialog open onOpenChange={(next) => !next && finish(false)}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">{t('welcome.title')}</DialogTitle>
          <DialogDescription className="text-center">{t('welcome.tour_prompt')}</DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-2">
          <Button onClick={() => finish(true)}>{t('welcome.start_tour')}</Button>
          <Button variant="ghost" onClick={() => finish(false)}>
            {t('welcome.skip')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
