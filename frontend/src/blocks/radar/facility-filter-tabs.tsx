import { Radar } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FACILITY_TYPE_META, type FacilityFilter } from '@/types/facility'
import { cn } from '@/lib/utils'

interface FacilityFilterTabsProps {
  value: FacilityFilter
  onChange: (value: FacilityFilter) => void
}

// Single-select (unlike map/category-filter.tsx's multi-select) — ported
// from hslee as-is, only one facility type makes sense to view at a time.
export function FacilityFilterTabs({ value, onChange }: FacilityFilterTabsProps) {
  const { t } = useTranslation()
  const tabs: { id: FacilityFilter; icon: typeof Radar; labelKey: string }[] = [
    { id: 'all', icon: Radar, labelKey: 'radar.filters.all' },
    ...FACILITY_TYPE_META.map(({ id, icon, labelKey }) => ({
      id,
      icon,
      labelKey: labelKey.replace('facility_types', 'filters'),
    })),
  ]

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-hide md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
      {tabs.map(({ id, icon: Icon, labelKey }) => {
        const active = value === id
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {t(labelKey)}
          </button>
        )
      })}
    </div>
  )
}
