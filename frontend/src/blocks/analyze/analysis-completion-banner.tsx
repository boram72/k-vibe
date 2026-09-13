import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, X, XCircle } from 'lucide-react'
import { useAnalyzeStore } from '@/store/analyze-store'
import { cn } from '@/lib/utils'

// SNS 분석은 백그라운드로 돈다(analyze-store.ts) — 끝났을 때 사용자가 SNS
// 분석기 화면에 있지 않을 수 있어서, 이 배너는 특정 페이지 컴포넌트가 아니라
// router/LocaleGuard.tsx에서 <Outlet/>과 나란히 항상 마운트돼 있다(그래서
// 모든 라우트에서 useLocation()/useNavigate() 같은 표준 라우터 훅을 그대로
// 쓸 수 있다 — router 인스턴스의 비공개 API(subscribe/state)에 기대지 않음).
//
// 위치를 하단으로 둔 이유: 일반 토스트(sonner, AppToaster)는 이미 상단-중앙
// 자리를 쓰고, 이 배너는 "닫기 전까지 남아있어야 하는" 알림이라 그 자리와
// 겹치면 혼란스럽다. 하단 탭바 위쪽 근처는 엄지로 닿기 쉽고 상단 알림과도
// 안 겹친다. 화면 가장자리에 붙이지 않고 여백을 둬서(토스트 카드처럼) 그림자와
// 둥근 모서리가 실제로 보이게 했다.
//
// SNS 분석기 화면에 있는 동안은 결과가 이미 그 자리에 그대로 보이므로 배너가
// 필요 없다(사용자 피드백) — 그 화면에 도착하는 순간 자동으로 "확인함" 처리해서
// 나중에 다른 탭으로 이동해도 뒤늦게 배너가 뜨지 않게 한다.
export function AnalysisCompletionBanner() {
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
    if (isOnAnalyzePage && isDone && !completionSeen) acknowledgeCompletion()
  }, [isOnAnalyzePage, isDone, completionSeen, acknowledgeCompletion])

  const visible = isDone && !completionSeen && !isOnAnalyzePage
  if (!visible) return null

  const isSuccess = status === 'success'

  function goToAnalyzePage() {
    acknowledgeCompletion()
    navigate('/analyze')
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6">
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border p-3 shadow-xl backdrop-blur-sm',
          isSuccess ? 'border-crowd-low/25 bg-crowd-low/10' : 'border-destructive/25 bg-destructive/10',
        )}
      >
        {isSuccess ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-crowd-low" />
        ) : (
          <XCircle className="h-5 w-5 shrink-0 text-destructive" />
        )}

        <p className={cn('min-w-0 flex-1 text-sm font-semibold leading-5', isSuccess ? 'text-crowd-low' : 'text-destructive')}>
          {isSuccess
            ? t('analyze.completion_toast_title')
            : t(errorKind === 'timeout' ? 'analyze.error_timeout' : 'analyze.error_generic')}
        </p>

        <button
          type="button"
          onClick={goToAnalyzePage}
          className={cn(
            'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90',
            isSuccess ? 'bg-crowd-low' : 'bg-destructive',
          )}
        >
          {isSuccess ? t('analyze.completion_toast_view') : t('analyze.retry')}
        </button>

        <button
          type="button"
          onClick={acknowledgeCompletion}
          aria-label={t('analyze.dismiss_notification')}
          className={cn(
            'shrink-0 rounded-lg p-1.5 transition-colors',
            isSuccess ? 'text-crowd-low hover:bg-crowd-low/15' : 'text-destructive hover:bg-destructive/15',
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
