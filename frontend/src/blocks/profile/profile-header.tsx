import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { LogOut, Sparkles, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/use-auth'
import { fetchSavedPlaces } from '@/lib/saved-places'
import { readRouteDraft } from '@/lib/route-draft'
import { readPersonaPreference } from '@/lib/persona-preference'

interface ProfileHeaderProps {
  onSignInClick: () => void
}

export function ProfileHeader({ onSignInClick }: ProfileHeaderProps) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { data: savedPlaces = [] } = useQuery({ queryKey: ['saved-places'], queryFn: fetchSavedPlaces })
  // Lazy initializers — both are one-time local reads, same pattern as
  // RoutePage's/LandingPage's mount-time localStorage reads.
  const [routeStopCount] = useState(() => readRouteDraft().length)
  const [personaPreference] = useState(() => readPersonaPreference())

  const personaLabel = personaPreference
    ? t(`persona.themes.${personaPreference.theme}.details.${personaPreference.detail}.label`)
    : t('profile.persona_unset')

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="text-xl font-bold">
            {user ? user.name.charAt(0).toUpperCase() : <User className="h-6 w-6" />}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-foreground">{user ? user.name : t('profile.guest_title')}</p>
          <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-muted-foreground">
            {user ? user.email : t('profile.guest_subtitle')}
          </p>
          <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            <Sparkles className="h-3 w-3 shrink-0" />
            <span className="shrink-0 text-muted-foreground">{t('profile.persona_label')}</span>
            <span className="truncate">{personaLabel}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-muted p-3 text-center">
          <p className="text-lg font-bold text-foreground">{savedPlaces.length}</p>
          <p className="text-xs text-muted-foreground">{t('profile.stats_places')}</p>
        </div>
        <div className="rounded-xl bg-muted p-3 text-center">
          <p className="text-lg font-bold text-foreground">{routeStopCount > 0 ? 1 : 0}</p>
          <p className="text-xs text-muted-foreground">{t('profile.stats_routes')}</p>
        </div>
      </div>

      {user ? (
        <Button variant="outline" className="mt-4 w-full" onClick={() => logout()}>
          <LogOut className="h-4 w-4" />
          {t('profile.sign_out')}
        </Button>
      ) : (
        <Button className="mt-4 w-full" onClick={onSignInClick}>
          <User className="h-4 w-4" />
          {t('profile.sign_in')}
        </Button>
      )}
    </section>
  )
}
