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
import { tourPageOf, useTourStore } from '@/store/tour-store'
import { HOME_TOUR_KEY, MAP_TOUR_KEY, PERSONA_TOUR_KEY, ROUTE_TOUR_KEY, ANALYZE_TOUR_KEY, TOUR_REGISTRY } from '@/blocks/tour/tour-steps'
import { EmptyRouteNotice } from '@/blocks/route/empty-route-notice'
import { TourResetNotice } from '@/blocks/tour/tour-reset-notice'
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
  const { title, body, tourReady, tourResetAction } = usePageHelpStore()
  const location = useLocation()
  const startTour = useTourStore((s) => s.start)
  const [emptyRouteNoticeOpen, setEmptyRouteNoticeOpen] = useState(false)
  const [resetNoticeOpen, setResetNoticeOpen] = useState(false)

  const pageKey = tourPageOf(location.pathname)
  const tourKey = PATH_TOUR_KEY[pageKey]

  function handleTourClick() {
    // 화면이 아직 준비 중이면(지도 랜딩 전) 버튼 자체가 잠겨 있지만, 혹시 모를
    // 경로(키보드 등)로 들어와도 투어를 띄우지 않는다.
    if (!tourReady) return
    // 내 루트가 비어있으면 투어 대신 "장소를 먼저 추가해 보세요" 안내 팝업 —
    // 비어있는 화면에서 투어를 재생하면 하이라이트할 대상(드래그 손잡이 등)이
    // 없어서 어두운 배경 위에 말풍선만 덩그러니 뜬다(사용자 지적). 저장된 루트
    // (localStorage `k-vibe-current-route`)가 비어있는지로 판단한다.
    if (tourKey === ROUTE_TOUR_KEY && readRouteDraft().length === 0) {
      setEmptyRouteNoticeOpen(true)
      return
    }
    // 결과 화면(SNS 분석 결과, 페르소나 루트 결과)처럼 투어가 가리킬 요소가 없는
    // 상태면 바로 띄우지 않고 "초기화 후 진행할까요?"를 먼저 묻는다.
    if (tourResetAction) {
      setResetNoticeOpen(true)
      return
    }
    // "?"로 직접 다시 여는 투어라 "다시 보지 않기"는 숨긴다(replay).
    startTour(tourKey, { replay: true })
  }

  // "초기화 후 진행" — 페이지가 등록해 둔 초기화(처음 화면으로 되돌리기)를 먼저 하고
  // 곧바로 투어를 시작한다. 같은 이벤트 안에서 상태가 같이 반영되므로 투어의 첫
  // 하이라이트 대상(처음 화면의 요소)이 바로 잡힌다.
  function handleResetAndStart() {
    setResetNoticeOpen(false)
    tourResetAction?.()
    startTour(tourKey, { replay: true })
  }

  // 이 페이지에 등록된 투어가 있으면 "?" 도움말 대신 투어 재생 버튼으로 바뀐다.
  if (tourKey && TOUR_REGISTRY[tourKey]) {
    return (
      <>
        {/* 잠긴(disabled) 버튼은 pointer-events가 꺼져서 자기 title 툴팁이 안 뜬다 — 바깥
            span에 "왜 잠겼는지" 툴팁을 달아서 호버하면 이유를 보여준다(사용자 요청). 잠기지
            않았을 땐 span에 title이 없어서 버튼 자기 title("K-Vibe 투어")이 그대로 뜬다. */}
        <span title={tourReady ? undefined : t('tour.map_loading_hint')} className="inline-flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('tour.button_label')}
            title={t('tour.button_label')}
            data-tour="home-tour-button"
            disabled={!tourReady}
            onClick={handleTourClick}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </span>
        {tourKey === ROUTE_TOUR_KEY && <EmptyRouteNotice open={emptyRouteNoticeOpen} onOpenChange={setEmptyRouteNoticeOpen} />}
        <TourResetNotice open={resetNoticeOpen} onOpenChange={setResetNoticeOpen} onConfirm={handleResetAndStart} />
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
