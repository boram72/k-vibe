import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import type { TourResetKind } from '@/store/page-help-store'

// 결과 화면(SNS 분석 결과, 페르소나 루트 결과)에서 "?"를 눌렀을 때 뜨는 확인 팝업 —
// 이 화면에는 튜토리얼이 가리킬 요소(URL 입력창, 페르소나 카드 목록 등)가 없어서 그대로
// 투어를 띄우면 어두운 배경 위에 말풍선만 떠서 오류처럼 보인다(사용자 지적). 그래서
// 먼저 "초기화 후 진행할까요?"를 묻고, 확인하면 화면을 처음 상태로 되돌린 뒤 투어를
// 시작한다(help-button.tsx). 닫기를 누르면 아무 일도 없이 팝업만 닫힌다.
//
// 지도에서 찜/관광지 추천 화면을 켜 둔 채 "?"를 눌렀을 때도 같은 팝업을 쓴다(kind='release') —
// 그 화면에서는 필터 탭이 숨겨져 있어서 투어가 중간(필터 단계)에 사라진다. 문구만 "해제 후
// 진행"으로 바뀌고 모양·동작은 같다.
//
// 버튼이 두 개라 버튼 줄에만 회색 배경(DialogFooter 기본 스타일)을 둔다(사용자 요청) —
// "루트 초기화" 확인 팝업(RoutePage)과 같은 모양: 닫기(흰색) / 진행(빨간색).
const COPY = {
  reset: {
    title: 'tour.reset_notice_title',
    body: 'tour.reset_notice_body',
    confirm: 'tour.reset_notice_confirm',
  },
  release: {
    title: 'tour.release_notice_title',
    body: 'tour.release_notice_body',
    confirm: 'tour.release_notice_confirm',
  },
} as const

interface TourResetNoticeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  kind?: TourResetKind
}

export function TourResetNotice({ open, onOpenChange, onConfirm, kind = 'reset' }: TourResetNoticeProps) {
  const { t, i18n } = useTranslation()
  const copy = COPY[kind]
  // 한국어는 좁은 폰에서 "튜토리얼/을"처럼 단어 중간에서 줄이 바뀌어 지저분해 보여서 띄어쓰기
  // 단위로만 줄바꿈한다. 일본어/중국어는 공백이 없어서 keep-all을 걸면 넘치므로 한국어에만 적용.
  const wrap = i18n.language === 'ko' ? 'break-keep' : undefined
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className={wrap}>{t(copy.title)}</DialogTitle>
          <DialogDescription className={wrap}>{t(copy.body)}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('tour.reset_notice_close')}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t(copy.confirm)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
