import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/lib/use-auth'
import { LoginModalContent } from '@/blocks/profile/login-modal-content'
import { ProfileHeader } from '@/blocks/profile/profile-header'
import { SettingsList } from '@/blocks/profile/settings-list'

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// TopBar 프로필 아이콘 클릭 시 전체 페이지(ProfilePage) 이동 대신 팝업으로
// 띄우는 용도. X로 언제든 닫을 수 있고, 닫으면 뒤에 있던 화면(지도 등)이 그대로
// 보인다(Dialog는 오버레이일 뿐 라우팅을 안 함).
//
// 상태 3개:
// - 로그인 안 함 + 게스트로도 아직 선택 안 함 → 로그인 프롬프트(LoginModalContent)
// - 게스트로 계속하기 클릭 → 같은 팝업 안에서 게스트 프로필뷰로 전환
// - user 있음(구글 로그인 완료) → 프로필뷰가 자동으로 로그인된 정보를 보여줌
//
// 팝업을 열 때마다(로그인 안 한 상태라면) 로그인 프롬프트부터 다시 시작 —
// "게스트로 계속" 선택은 이 팝업이 열려있는 동안만 유지되고 영속되지 않는다.
// 게스트로 이용하기 선택 직후 팝업이 자동으로 닫히기까지의 대기 시간(초).
const GUEST_AUTO_CLOSE_SECONDS = 5

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [showProfileView, setShowProfileView] = useState(!!user)
  // "게스트로 이용하기"를 방금 눌러서 뜬 프로필뷰인지 여부 — 로그인 완료 후
  // 보이는 프로필뷰와 구분해서, 이 경우에만 자동종료 안내+타이머를 건다.
  const [justContinuedAsGuest, setJustContinuedAsGuest] = useState(false)
  // 5→4→3→2→1로 화면에 보이는 카운트다운. 0이 되는 순간 닫는다.
  const [guestCountdown, setGuestCountdown] = useState(GUEST_AUTO_CLOSE_SECONDS)

  // lint 수정 — effect에서 setState하는 대신, React 공식 문서가 권장하는
  // "렌더 중 이전 prop과 비교해 state 조정" 패턴으로 전환(map-canvas.tsx의
  // focusCenter와 동일 패턴). open이 false→true로 바뀌는 그 렌더에서 즉시
  // 반영되어 effect 한 프레임 지연 없이 동작.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setShowProfileView(!!user)
      setJustContinuedAsGuest(false)
    }
  }

  useEffect(() => {
    if (!justContinuedAsGuest) return
    const interval = setInterval(() => {
      setGuestCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [justContinuedAsGuest])

  useEffect(() => {
    if (justContinuedAsGuest && guestCountdown <= 0) onOpenChange(false)
  }, [justContinuedAsGuest, guestCountdown, onOpenChange])

  const showLogin = !user && !showProfileView

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {showLogin ? (
          <LoginModalContent
            onGuestContinue={() => {
              setShowProfileView(true)
              setJustContinuedAsGuest(true)
              setGuestCountdown(GUEST_AUTO_CLOSE_SECONDS)
            }}
          />
        ) : (
          <>
            <DialogTitle className="sr-only">{t('profile.title')}</DialogTitle>
            {justContinuedAsGuest && (
              <p className="absolute top-2 right-10 flex h-7 items-center text-xs font-medium text-destructive">
                {t('profile.guest_auto_close_notice', { seconds: Math.max(guestCountdown, 0) })}
              </p>
            )}
            <div className="min-w-0 space-y-4">
              <ProfileHeader onSignInClick={() => setShowProfileView(false)} />
              <SettingsList />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
