import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSkeleton } from '@/blocks/common/loading-skeleton'
import { FacilityCard } from '@/blocks/radar/facility-card'
import type { Facility } from '@/types/facility'

interface FacilityListProps {
  facilities: Facility[]
  isLoading: boolean
  isError: boolean
  nextRadius: number | null
  onRetry: () => void
  onExpandRadius: () => void
  onViewOnInternalMap: (facility: Facility) => void
}

export function FacilityList({ facilities, isLoading, isError, nextRadius, onRetry, onExpandRadius, onViewOnInternalMap }: FacilityListProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return <LoadingSkeleton variant="list" count={4} />
  }

  if (isError) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">{t('radar.error_title')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('radar.retry')}
        </Button>
      </div>
    )
  }

  if (facilities.length === 0) {
    return (
      <div className="space-y-2 px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">{t('radar.empty_title')}</p>
        <p className="text-xs text-muted-foreground">{t('radar.empty_hint')}</p>
        {nextRadius && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onExpandRadius}>
            {t('radar.expand_radius')}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {facilities.map((facility) => (
        <FacilityCard key={facility.id} facility={facility} onViewOnInternalMap={onViewOnInternalMap} />
      ))}
    </div>
  )
}
