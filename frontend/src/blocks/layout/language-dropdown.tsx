import { useLocation, useNavigate } from 'react-router-dom'
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

export function LanguageDropdown() {
  const location = useLocation()
  const navigate = useNavigate()
  const segments = location.pathname.split('/')
  const current = segments[1] as Locale

  function switchLocale(code: Locale) {
    segments[1] = code
    navigate(segments.join('/'))
  }

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
