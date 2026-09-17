import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SUPPORTED_LOCALES, LOCALE_META, type Locale } from '@/i18n'
import { useTourStore, hasSeenTour } from '@/store/tour-store'
import { cn } from '@/lib/utils'
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

// 튜토리얼을 시작하기 전에 언어부터 고르게 한다 — 언어를 안 정한 채로
// 코치마크 문구를 보여주면 사용자에게 안 맞는 언어로 튜토리얼을 보게 될
// 수 있어서(사용자 피드백), 홈에 처음 온 사용자에게만 2단계로 먼저 띄운다:
// 1) 언어 선택 → 2) "둘러볼까요?" 확인 → 확인하면 그제서야 홈 투어 시작.
type Stage = 'idle' | 'language' | 'intro'

// localStorage 읽기는 마운트 시점에 딱 한 번만 필요해서(이후엔 이 컴포넌트
// 내부 state로만 단계를 관리) useState의 lazy initializer로 계산한다 —
// useEffect + setState로 하면 첫 렌더는 무조건 'idle'로 한 번 그려졌다가
// 바로 다음 렌더에서 바뀌는 깜빡임이 생긴다.
function initialStage(): Stage {
  return !hasSeenWelcome() && !hasSeenTour(HOME_TOUR_KEY) ? 'language' : 'idle'
}

export function WelcomeGate() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const startTour = useTourStore((s) => s.start)
  const [stage, setStage] = useState<Stage>(initialStage)
  // 바로 이동시키지 않고 일단 골라만 두는 이유 — 실수로 다른 언어를 눌렀을 때
  // 바로 화면이 바뀌어버리면 되돌리기 번거로워서, "다음"을 눌러야 확정되게
  // 한 단계를 더 둔다(사용자 피드백).
  const [selectedLocale, setSelectedLocale] = useState<Locale | null>(null)

  function confirmLocale() {
    if (!selectedLocale) return
    const segments = location.pathname.split('/')
    segments[1] = selectedLocale
    navigate(segments.join('/'))
    setStage('intro')
  }

  function finish(startTourNow: boolean) {
    markWelcomeSeen()
    setStage('idle')
    if (startTourNow) startTour(HOME_TOUR_KEY)
  }

  if (stage === 'idle') return null

  return (
    <Dialog open onOpenChange={(open) => !open && finish(false)}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        {stage === 'language' ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-lg">{t('welcome.title')}</DialogTitle>
              <DialogDescription className="text-center">{t('welcome.language_prompt')}</DialogDescription>
            </DialogHeader>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {SUPPORTED_LOCALES.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedLocale(code)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border p-4 text-sm font-medium transition-colors',
                    selectedLocale === code
                      ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
                      : 'border-border text-foreground hover:border-primary hover:bg-primary/5',
                  )}
                >
                  <span className="text-2xl">{LOCALE_META[code].flag}</span>
                  {LOCALE_META[code].label}
                </button>
              ))}
            </div>
            <Button className="mt-4 w-full" disabled={!selectedLocale} onClick={confirmLocale}>
              {t('welcome.next')}
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-lg">{t('welcome.tour_prompt')}</DialogTitle>
            </DialogHeader>
            <div className="mt-2 flex flex-col gap-2">
              <Button onClick={() => finish(true)}>{t('welcome.start_tour')}</Button>
              <Button variant="ghost" onClick={() => finish(false)}>
                {t('welcome.skip')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
