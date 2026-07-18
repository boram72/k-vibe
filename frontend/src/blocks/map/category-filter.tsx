import { useTranslation } from 'react-i18next'
import { PLACE_CATEGORIES, type PlaceCategory } from '@/types/place'
import { cn } from '@/lib/utils'

interface CategoryFilterProps {
  selected: PlaceCategory[]
  onChange: (categories: PlaceCategory[]) => void
  collapsed?: boolean
}

export function CategoryFilter({ selected, onChange, collapsed = false }: CategoryFilterProps) {
  const { t } = useTranslation()

  function toggle(id: PlaceCategory) {
    if (id === 'all') {
      onChange(['all'])
      return
    }
    const next = selected.includes(id)
      ? selected.filter((category) => category !== id)
      : [...selected.filter((category) => category !== 'all'), id]
    onChange(next.length === 0 ? ['all'] : next)
  }

  return (
    <div
      className={cn(
        collapsed
          ? 'flex flex-col items-center gap-2'
          : '-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-hide md:mx-0 md:flex-wrap md:overflow-visible md:px-0',
      )}
    >
      {PLACE_CATEGORIES.map(({ id, icon: Icon, labelKey }) => {
        const active = selected.includes(id)
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            aria-label={t(labelKey)}
            title={collapsed ? t(labelKey) : undefined}
            onClick={() => toggle(id)}
            className={cn(
              'flex items-center transition-colors',
              collapsed
                ? 'h-9 w-9 justify-center rounded-full'
                : 'gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium',
              active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {!collapsed && t(labelKey)}
          </button>
        )
      })}
    </div>
  )
}
