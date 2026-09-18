import { Dialog, DialogContent } from '@/components/ui/dialog'
import { LoginModalContent } from '@/blocks/profile/login-modal-content'

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ProfilePage(전체 페이지)에서 쓰는 로그인 팝업 — 게스트로 계속하기는 팝업만
// 닫으면 된다(뒤에 이미 게스트 프로필이 깔려있는 페이지라서). TopBar 프로필
// 아이콘 팝업(profile-dialog.tsx)은 같은 콘텐츠를 다른 onGuestContinue로 재사용.
export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <LoginModalContent onGuestContinue={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
