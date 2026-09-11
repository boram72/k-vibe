import { useTranslation } from 'react-i18next'
import { CheckCircle2, X, XCircle } from 'lucide-react'
import { useAnalyzeStore } from '@/store/analyze-store'
import { router } from '@/router'
import { cn } from '@/lib/utils'

// SNS 분석은 이제 백그라운드로 돈다(analyze-store.ts) — 끝났을 때 사용자가
// SNS 분석기 화면에 있지 않을 수 있어서, 이 배너는 특정 라우트에 묶이지 않고
// main.tsx의 앱 루트(AppToaster 옆)에 항상 마운트돼 있다. 그래서 라우트 트리
// 밖에 있어 useNavigate() 훅을 못 쓰고, 대신 createBrowserRouter가 주는
// router.navigate()로 직접 이동한다.
//
// 위치를 하단 고정 바로 둔 이유: 일반 토스트(sonner, AppToaster)는 이미
// 상단-중앙에서 잠깐 떴다 사라지는 자리를 쓰고 있고, 이 배너는 "닫기 전까지
// 남아있어야 하는" 알림이라 그 자리와 겹치면 혼란스럽다. 하단 탭바 바로 위는
// (1) 엄지로 닿기 쉽고 (2) 상단 알림과 안 겹치고 (3) 이 앱이 이미 쓰는 "하단
// 고정 액션바" 패턴(AnalyzePage의 지도보기/루트추가 바)과 일관된다.
export function AnalysisCompletionBanner() {
  const { t, i18n } = useTranslation()
  const status = useAnalyzeStore((s) => s.status)
  const completionSeen = useAnalyzeStore((s) => s.completionSeen)
  const errorKind = useAnalyzeStore((s) => s.errorKind)
  const acknowledgeCompletion = useAnalyzeStore((s) => s.acknowledgeCompletion)

  const visible = !completionSeen && (status === 'success' || status === 'error')
  if (!visible) return null

  const isSuccess = status === 'success'

  function goToAnalyzePage() {
    acknowledgeCompletion()
    router.navigate(`/${i18n.language}/analyze`)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed inset-x-0 bottom-16 z-50 md:bottom-0',
        'mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3 shadow-lg',
        isSuccess ? 'bg-crowd-low text-white' : 'bg-destructive text-white',
      )}
    >
      {isSuccess ? (
        <CheckCircle2 className="h-5 w-5 shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 shrink-0" />
      )}

      <p className="min-w-0 flex-1 text-sm font-semibold leading-5">
        {isSuccess
          ? t('analyze.completion_toast_title')
          : t(errorKind === 'timeout' ? 'analyze.error_timeout' : 'analyze.error_generic')}
      </p>

      <button
        type="button"
        onClick={goToAnalyzePage}
        className="shrink-0 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/30"
      >
        {isSuccess ? t('analyze.completion_toast_view') : t('analyze.retry')}
      </button>

      <button
        type="button"
        onClick={acknowledgeCompletion}
        aria-label={t('analyze.dismiss_notification')}
        className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/20"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
