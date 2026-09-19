import { useState } from 'react'
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
import { HOME_TOUR_KEY, MAP_TOUR_KEY, PERSONA_TOUR_KEY, ROUTE_TOUR_KEY, ANALYZE_TOUR_KEY, TOUR_REGISTRY } from '@/blocks/tour/tour-steps'
import { EmptyRouteNotice } from '@/blocks/route/empty-route-notice'
import { readRouteDraft } from '@/lib/route-draft'

// locale 세그먼트를 뗀 나머지 경로('' = 홈, 'map', 'analyze' ...) 별로 어떤
// 투어를 재생할지 매핑 — 아직 투어가 없는 페이지는 기존 정적 도움말 팝업으로
// 자연스럽게 폴백된다(아래 참고).
const PATH_TOUR_KEY: Record<string, string> = {
  '': HOME_TOUR_KEY,
  map: MAP_TOUR_KEY,
  persona: PERSONA_TOUR_KEY,
  route: ROUTE_TOUR_KEY,
  analyze: ANALYZE_TOUR_KEY,
}

export function HelpButton() {
  const { t } = useTranslation()
  const { title, body } = usePageHelpStore()
  const location = useLocation()
  const startTour = useTourStore((s) => s.start)
  const [emptyRouteNoticeOpen, setEmptyRouteNoticeOpen] = useState(false)

  const segments = location.pathname.split('/').filter(Boolean)
  const pageKey = segments.slice(1).join('/')
  const tourKey = PATH_TOUR_KEY[pageKey]

  function handleTourClick() {
    // 내 루트가 비어있으면 투어 대신 "장소를 먼저 추가해 보세요" 안내 팝업 —
    // 비어있는 화면에서 투어를 재생하면 하이라이트할 대상(드래그 손잡이 등)이
    // 없어서 어두운 배경 위에 말풍선만 덩그러니 뜬다(사용자 지적). 저장된 루트
    // (localStorage `k-vibe-current-route`)가 비어있는지로 판단한다.
    if (tourKey === ROUTE_TOUR_KEY && readRouteDraft().length === 0) {
      setEmptyRouteNoticeOpen(true)
      return
    }
    // "?"로 직접 다시 여는 투어라 "다시 보지 않기"는 숨긴다(replay).
    startTour(tourKey, { replay: true })
  }

  // 이 페이지에 등록된 투어가 있으면 "?" 도움말 대신 투어 재생 버튼으로 바뀐다.
  if (tourKey && TOUR_REGISTRY[tourKey]) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('tour.button_label')}
          title={t('tour.button_label')}
          data-tour="home-tour-button"
          onClick={handleTourClick}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
        {tourKey === ROUTE_TOUR_KEY && <EmptyRouteNotice open={emptyRouteNoticeOpen} onOpenChange={setEmptyRouteNoticeOpen} />}
      </>
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
