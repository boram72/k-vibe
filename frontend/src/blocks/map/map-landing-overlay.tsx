import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

// GPS 확보+관할 정부처 좌표 변환(resolveAdminOfficeCoords) 동안 뜨는 오버레이 —
// 예전엔 빈 스켈레톤만 깜빡여서 멈춘 것처럼 보인다는 피드백(대화 중 요청).
// analyze/analysis-loading.tsx와 동일한 "체감 진행률" 방식 — 실제 완료 시점을
// 알 수 없어서(GPS 응답 시간이 매번 다름) 타이머로 서서히 채우다 CAP에서
// 멈추고, 실제로 끝나면(부모가 이 컴포넌트를 언마운트) 그대로 사라진다.
const PROGRESS_CAP = 92
const PROGRESS_DURATION_MS = 2500
const PROGRESS_TICK_MS = 100

export function MapLandingOverlay() {
  const { t } = useTranslation()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const ticksToCap = PROGRESS_DURATION_MS / PROGRESS_TICK_MS
    const step = PROGRESS_CAP / ticksToCap
    const timer = window.setInterval(() => {
      setProgress((p) => Math.min(p + step, PROGRESS_CAP))
    }, PROGRESS_TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-3">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
      <p className="text-sm font-medium text-foreground">{t('map.locating_title')}</p>
      {/* shadcn Progress의 트랙 색(bg-muted)이 배경 Skeleton(bg-muted)과 겹쳐
          안 보여서, analysis-loading.tsx와 동일하게 bg-border 트랙으로 직접
          그린다(그쪽도 bg-muted 카드 위에서 이 조합으로 이미 잘 보임). */}
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
