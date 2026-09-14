import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAnalyzeStore } from '@/store/analyze-store'

// 같은 id로 계속 upsert해서, 상태가 바뀌는 사이 이 컴포넌트가 다시 렌더돼도
// sonner가 토스트를 여러 개 쌓지 않고 하나만 유지하게 한다.
const TOAST_ID = 'analyze-completion'

// SNS 분석은 백그라운드로 돈다(analyze-store.ts) — 끝났을 때 사용자가 SNS
// 분석기 화면에 있지 않을 수 있어서, 이 컴포넌트는 특정 페이지가 아니라
// router/LocaleGuard.tsx에서 <Outlet/>과 나란히 항상 마운트돼 있다(그래서
// 모든 라우트에서 useLocation()/useNavigate() 같은 표준 라우터 훅을 그대로
// 쓸 수 있다 — router 인스턴스의 비공개 API(subscribe/state)에 기대지 않음).
//
// 화면에는 아무것도 그리지 않는다 — 상태 변화를 지켜보다가 앱 전역에 이미 떠
// 있는 sonner 토스트(components/ui/sonner.tsx, blocks/common/app-toaster.tsx)를
// 그대로 재사용한다. 직접 그리던 커스텀 배너보다 이쪽이 테마 대응·닫기
// 버튼·그림자/모서리가 이미 다 갖춰져 있고, 다른 토스트들과 자리 계산도
// 알아서 겹치지 않는다(사용자 피드백: "토스트 팝업같이 알림창을 만들자").
//
// SNS 분석기 화면에 있는 동안은 결과가 이미 그 자리에 그대로 보이므로 토스트가
// 필요 없다(사용자 피드백) — 그 화면에 도착하는 순간 자동으로 "확인함" 처리해서
// 나중에 다른 탭으로 이동해도 뒤늦게 토스트가 뜨지 않게 한다.
export function AnalysisCompletionToast() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const status = useAnalyzeStore((s) => s.status)
  const completionSeen = useAnalyzeStore((s) => s.completionSeen)
  const errorKind = useAnalyzeStore((s) => s.errorKind)
  const acknowledgeCompletion = useAnalyzeStore((s) => s.acknowledgeCompletion)

  const isDone = status === 'success' || status === 'error'
  const isOnAnalyzePage = /\/analyze(\/|$)/.test(location.pathname)

  useEffect(() => {
    if (!isDone || completionSeen) return

    if (isOnAnalyzePage) {
      toast.dismiss(TOAST_ID)
      acknowledgeCompletion()
      return
    }

    const isSuccess = status === 'success'
    const title = isSuccess
      ? t('analyze.completion_toast_title')
      : t(errorKind === 'timeout' ? 'analyze.error_timeout' : 'analyze.error_generic')
    const actionLabel = isSuccess ? t('analyze.completion_toast_view') : t('analyze.retry')
    const showToast = isSuccess ? toast.success : toast.error

    showToast(title, {
      id: TOAST_ID,
      duration: Infinity, // 닫기 전까진 유지 — acknowledgeCompletion으로만 사라짐
      action: {
        label: actionLabel,
        onClick: () => {
          acknowledgeCompletion()
          // 상대 경로로 navigate — 이 컴포넌트는 LocaleGuard('/:locale') 아래
          // 마운트돼 있어서 'analyze'가 현재 locale 세그먼트를 유지한 채
          // `/{locale}/analyze`로 풀린다. 예전엔 '/analyze'로 절대경로를 써서
          // locale 세그먼트가 빠졌고, 라우터가 그 경로를 못 찾아 catch-all
          // 라우트를 타고 홈으로 튕겨나갔다(버그 리포트: '결과 보기'를 눌러도
          // 토스트만 닫히고 분석기 화면으로 안 넘어감).
          navigate('analyze')
        },
      },
      // 닫기 버튼을 누르거나 스와이프로 지워도 "확인함" 처리 — 안 그러면
      // 다른 탭으로 이동했다가 다시 조건이 맞아 토스트가 되살아날 수 있다.
      onDismiss: () => acknowledgeCompletion(),
    })
  }, [isDone, completionSeen, isOnAnalyzePage, status, errorKind, t, navigate, acknowledgeCompletion])

  return null
}
