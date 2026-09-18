import { HelpCircle } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { usePageHelpStore } from '@/store/page-help-store'
import { useTourStore } from '@/store/tour-store'
import { HOME_TOUR_KEY, MAP_TOUR_KEY, PERSONA_TOUR_KEY, ROUTE_TOUR_KEY, TOUR_REGISTRY } from '@/blocks/tour/tour-steps'

// locale 세그먼트를 뗀 나머지 경로('' = 홈, 'map', 'analyze' ...) 별로 어떤
// 투어를 재생할지 매핑 — 아직 투어가 없는 페이지는 기존 정적 도움말 팝업으로
// 자연스럽게 폴백된다(아래 참고). SNS 분석기는 화면 구조가 곧 바뀔 예정이라
// 투어를 먼저 안 만든다(사용자 결정).
const PATH_TOUR_KEY: Record<string, string> = {
  '': HOME_TOUR_KEY,
  map: MAP_TOUR_KEY,
  persona: PERSONA_TOUR_KEY,
  route: ROUTE_TOUR_KEY,
}

export function HelpButton() {
  const { t } = useTranslation()
  const { title, body } = usePageHelpStore()
  const location = useLocation()
  const startTour = useTourStore((s) => s.start)

  const segments = location.pathname.split('/').filter(Boolean)
  const pageKey = segments.slice(1).join('/')
  const tourKey = PATH_TOUR_KEY[pageKey]

  // 이 페이지에 등록된 투어가 있으면 "?" 도움말 대신 투어 재생 버튼으로 바뀐다.
  if (tourKey && TOUR_REGISTRY[tourKey]) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('tour.button_label')}
        title={t('tour.button_label')}
        data-tour="home-tour-button"
        onClick={() => startTour(tourKey)}
      >
        <HelpCircle className="h-4 w-4" />
      </Button>
    )
  }

  if (!title) return null

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Page help" />}>
        <HelpCircle className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
