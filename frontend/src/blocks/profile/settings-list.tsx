import { useTranslation } from 'react-i18next'
import { Bell, Languages, type LucideIcon } from 'lucide-react'

// Display-only for now — neither row toggles anything yet.
// - Language: TopBar's LanguageDropdown already does the real switch; this
//   row is just a visible summary of the current locale.
// - Notifications: only buildable as "while this tab stays open" (the
//   Notification API, no service worker needed) — not as true push that
//   survives a fully closed tab/browser (that needs a service worker, which
//   this app doesn't have). Either way it's still unbuilt — Step13+.
//
// "Offline maps" / "map data" rows from the original design were dropped —
// web map APIs (Kakao/Google/any provider) have no offline-tile-download
// capability at all, unlike native mobile map SDKs, so those two settings
// could never become real features in this architecture regardless of which
// map provider Step13 picks.
export function SettingsList() {
  const { t, i18n } = useTranslation()

  const items: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Languages, label: t('profile.settings_language'), value: i18n.language.toUpperCase() },
    { icon: Bell, label: t('profile.settings_notifications'), value: t('profile.settings_on') },
  ]

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-bold text-foreground">{t('profile.settings_title')}</p>
      </div>
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex w-full items-center gap-3 border-b border-border px-4 py-4 last:border-b-0">
          <Icon className="h-[18px] w-[18px] text-primary" />
          <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">{value}</span>
        </div>
      ))}
    </section>
  )
}
