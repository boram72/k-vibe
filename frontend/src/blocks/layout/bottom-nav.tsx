import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NAV_ITEMS } from './nav-items'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const { t } = useTranslation()

  return (
    <nav className="sticky bottom-0 z-40 flex h-16 shrink-0 items-center justify-around border-t border-border bg-background md:hidden">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-xs',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )
          }
        >
          <item.icon className="h-5 w-5" />
          <span>{t(item.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  )
}
