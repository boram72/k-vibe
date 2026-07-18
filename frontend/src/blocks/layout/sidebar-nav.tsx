import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NAV_ITEMS } from './nav-items'
import { useSidebarStore } from '@/store/sidebar-store'
import { cn } from '@/lib/utils'

export function SidebarNav() {
  const { t } = useTranslation()
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col gap-1 border-r border-border bg-background p-2 md:flex',
        isCollapsed ? 'w-16' : 'w-60',
      )}
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          title={isCollapsed ? t(item.labelKey) : undefined}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              isCollapsed && 'justify-center px-0',
            )
          }
        >
          <item.icon className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>{t(item.labelKey)}</span>}
        </NavLink>
      ))}
    </aside>
  )
}
