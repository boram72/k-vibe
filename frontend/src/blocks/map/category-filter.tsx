import { useTranslation } from 'react-i18next'
import { PLACE_CATEGORIES, type PlaceCategory } from '@/types/place'
import { cn } from '@/lib/utils'

interface CategoryFilterProps {
  selected: PlaceCategory
  onChange: (category: PlaceCategory) => void
  collapsed?: boolean
}

// 2026-09 QA 피드백 7번 — 원래 다중선택이었는데, 음식/숙소처럼 보통 동시에
// 보지 않는 카테고리들이라 하나 고르면 이전 선택이 자동으로 풀리는 단일선택
// (라디오 버튼 방식)으로 변경. 이미 선택된 걸 다시 누르면 "전체"로 되돌아감.
export function CategoryFilter({ selected, onChange, collapsed = false }: CategoryFilterProps) {
  const { t } = useTranslation()

  function toggle(id: PlaceCategory) {
    onChange(id === selected ? 'all' : id)
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
        const active = selected === id
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
