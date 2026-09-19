import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

// "내 루트"가 비어있을 때 튜토리얼(투어) 대신 띄우는 안내 팝업 — 비어있는 화면에
// 투어를 재생하면 하이라이트할 대상(드래그 손잡이 등)이 없어서 어두운 배경 위에
// 말풍선만 덩그러니 뜬다(사용자 지적). "?" 버튼(help-button.tsx)을 눌렀을 때와,
// 비어있는 내 루트에 처음 들어왔을 때(RoutePage) 같은 팝업을 쓴다.
interface EmptyRouteNoticeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmptyRouteNotice({ open, onOpenChange }: EmptyRouteNoticeProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('route.empty_notice_title')}</DialogTitle>
          <DialogDescription>{t('route.empty_notice_body')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t('route.empty_notice_confirm')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
