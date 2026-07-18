import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProfileHeader } from '@/blocks/profile/profile-header'
import { SavedPlacesGrid } from '@/blocks/profile/saved-places-grid'
import { CurrentRouteCard } from '@/blocks/profile/current-route-card'
import { SettingsList } from '@/blocks/profile/settings-list'
import { LoginModal } from '@/blocks/profile/login-modal'
import { usePageHelpStore } from '@/store/page-help-store'

export default function ProfilePage() {
  const { t } = useTranslation()
  const setHelp = usePageHelpStore((s) => s.setHelp)
  const clearHelp = usePageHelpStore((s) => s.clearHelp)
  const [loginOpen, setLoginOpen] = useState(false)

  useEffect(() => {
    setHelp(t('profile.help_title'), t('profile.help_body'))
    return () => clearHelp()
  }, [setHelp, clearHelp, t])

  return (
    <div className="mx-auto flex min-h-full w-full flex-col px-4 py-4 md:max-w-6xl">
      <h2 className="mb-4 text-lg font-bold text-foreground">{t('profile.title')}</h2>

      {/*
        Mobile (flex-col): natural DOM order gives header → content → settings.
        Desktop (md:grid-cols-[1fr_360px]): explicit placement instead of relying on
        `order` + auto-flow, since auto-flow would alternate items across the two
        columns row-by-row rather than stacking [header, settings] together in one
        column and [saved places, route] together in the other.
      */}
      <div className="flex min-w-0 flex-col gap-4 md:grid md:grid-cols-[1fr_360px] md:items-start">
        <div className="min-w-0 space-y-4 md:col-start-2 md:row-start-1">
          <ProfileHeader onSignInClick={() => setLoginOpen(true)} />
        </div>

        <div className="min-w-0 space-y-4 md:col-start-1 md:row-start-1 md:row-span-2">
          <SavedPlacesGrid />
          <CurrentRouteCard />
        </div>

        <div className="min-w-0 space-y-4 md:col-start-2 md:row-start-2">
          <SettingsList />
        </div>
      </div>

      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  )
}
