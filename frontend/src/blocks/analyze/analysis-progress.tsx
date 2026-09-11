import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'

interface AnalysisProgressProps {
  percent: number
}

// 분석 요청은 최대 ~2분 걸릴 수 있고 이제 백그라운드로 돈다(analyze-store.ts의
// startAnalysis — 사용자가 다른 탭/홈으로 이동해도 계속 진행됨). 그래서 화면을
// 막는 오버레이 대신 '스팟 분석' 버튼 바로 아래의 작은 진행률 표시로 충분하다.
// percent는 실제 서버 진행률이 아니라 store가 시간 기반으로 계산한 체감값.
export function AnalysisProgress({ percent }: AnalysisProgressProps) {
  const { t } = useTranslation()

  return (
    <div role="status" aria-live="polite" className="space-y-1.5 rounded-xl border border-border bg-muted p-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 shrink-0 animate-pulse text-primary" />
        <p className="flex-1 text-xs font-semibold text-foreground">{t('analyze.loading_title')}</p>
        <p className="shrink-0 text-xs font-semibold text-primary">{percent}%</p>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${percent}%` }} />
      </div>

      <p className="text-[11px] leading-4 text-muted-foreground">{t('analyze.loading_background_hint')}</p>
    </div>
  )
}
