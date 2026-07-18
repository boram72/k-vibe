import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type CrowdLevel = 'low' | 'mid' | 'high'

const LABEL_KEY: Record<CrowdLevel, string> = {
  low: 'common.crowd_low',
  mid: 'common.crowd_mid',
  high: 'common.crowd_high',
}

const DOT_CLASS: Record<CrowdLevel, string> = {
  low: 'bg-crowd-low',
  mid: 'bg-crowd-mid',
  high: 'bg-crowd-high',
}

const TEXT_CLASS: Record<CrowdLevel, string> = {
  low: 'text-crowd-low',
  mid: 'text-crowd-mid',
  high: 'text-crowd-high',
}

interface CrowdBadgeProps {
  level: CrowdLevel
  className?: string
}

export function CrowdBadge({ level, className }: CrowdBadgeProps) {
  const { t } = useTranslation()

  return (
    <Badge variant="outline" className={cn(TEXT_CLASS[level], className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT_CLASS[level])} />
      {t(LABEL_KEY[level])}
    </Badge>
  )
}
