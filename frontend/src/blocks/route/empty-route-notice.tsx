import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

// "내 루트"가 비어있을 때 튜토리얼(투어) 대신 띄우는 안내 팝업 — 비어있는 화면에
// 투어를 재생하면 하이라이트할 대상(드래그 손잡이 등)이 없어서 어두운 배경 위에
// 말풍선만 덩그러니 뜬다(사용자 지적). "?" 버튼(help-button.tsx)을 눌렀을 때와,
// 비어있는 내 루트에 처음 들어왔을 때(RoutePage) 같은 팝업을 쓴다.
//
// 2026-09: 버튼 줄을 DialogFooter 대신 평범한 div로 바꿨다(사용자 지적: "다른 팝업이랑
// 디자인이 통일이 안 됐다, 배경이 두 가지 색"). DialogFooter는 회색 배경(bg-muted/50)
// + 위쪽 구분선이 기본이라, 이 팝업처럼 p-6으로 안쪽 여백을 키운 DialogContent 안에서는
// 회색 띠가 가장자리까지 안 닿고 떠 보인다. SNS 분석기의 "선택" 팝업(AnalyzePage)처럼
// 배경은 흰색 하나로 두고 버튼 배치(모바일은 꽉 차게, 데스크톱은 오른쪽)는 그대로 둔다.
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
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => onOpenChange(false)}>{t('route.empty_notice_confirm')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
