import { useLocation } from 'react-router-dom'
import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SUPPORTED_LOCALES, LOCALE_META, type Locale } from '@/i18n'
import { cn } from '@/lib/utils'
import { useSwitchLocale } from '@/lib/use-switch-locale'

export function LanguageDropdown() {
  const location = useLocation()
  const current = location.pathname.split('/')[1] as Locale
  const switchLocale = useSwitchLocale()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Switch language" />}>
        <Globe className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => switchLocale(code)}
            className={cn(current === code && 'font-semibold text-primary')}
          >
            <span className="mr-2">{LOCALE_META[code].flag}</span>
            {LOCALE_META[code].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
