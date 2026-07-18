import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TopBar } from '@/blocks/layout/top-bar'
import { SidebarNav } from '@/blocks/layout/sidebar-nav'
import { BottomNav } from '@/blocks/layout/bottom-nav'
import { ErrorBoundary } from '@/blocks/common/error-boundary'
import { HomeFeed } from '@/blocks/landing/home-feed'
import { TrendingKeywords } from '@/blocks/landing/trending-keywords'
import { Button } from '@/components/ui/button'
import { usePageHelpStore } from '@/store/page-help-store'

export default function LandingPage() {
  const { t } = useTranslation()
  const setHelp = usePageHelpStore((s) => s.setHelp)
  const clearHelp = usePageHelpStore((s) => s.clearHelp)

  useEffect(() => {
    setHelp(t('landing.help_title'), t('landing.help_body'))
    return () => clearHelp()
  }, [setHelp, clearHelp, t])

  return (
    <div className="flex h-dvh flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SidebarNav />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <ErrorBoundary>
            <div className="mx-auto flex w-full flex-col items-center gap-6 px-4 py-4 md:max-w-5xl md:px-8 md:py-8">
              <div className="hidden w-full items-center justify-between gap-6 md:flex">
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {t("landing.subtitle")}
                </p>
                <Button
                  size="lg"
                  className="shrink-0"
                  nativeButton={false}
                  render={<Link to="map" />}
                >
                  {t("landing.start_btn")} →
                </Button>
              </div>

              <HomeFeed />
              <TrendingKeywords />

              <Button
                size="lg"
                className="w-full max-w-sm md:hidden"
                nativeButton={false}
                render={<Link to="map" />}
              >
                {t("landing.start_btn")} →
              </Button>
            </div>
          </ErrorBoundary>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
