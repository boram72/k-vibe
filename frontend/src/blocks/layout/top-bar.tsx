import { Link } from 'react-router-dom'
import { Moon, Sun, PanelLeft, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/store/theme-store'
import { useSidebarStore } from '@/store/sidebar-store'
import { useAuth } from '@/lib/use-auth'
import { LogoIcon } from '@/assets/logo-icon'
import { HelpButton } from './help-button'
import { LanguageDropdown } from './language-dropdown'

export function TopBar() {
  const { resolvedTheme, setTheme } = useThemeStore()
  const toggleSidebar = useSidebarStore((s) => s.toggle)
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Link to="." className="flex items-center gap-1.5 text-lg font-semibold text-foreground">
          <LogoIcon className="h-5 w-5 text-primary" />
          K-Vibe
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <HelpButton />
        <LanguageDropdown />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>

        <Link to="profile" aria-label="Profile">
          <Avatar>
            <AvatarFallback>
              {user ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  )
}
