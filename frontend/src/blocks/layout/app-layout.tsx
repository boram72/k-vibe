import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { TopBar } from './top-bar'
import { SidebarNav } from './sidebar-nav'
import { BottomNav } from './bottom-nav'
import { ErrorBoundary } from '@/blocks/common/error-boundary'
import { flushRouteDraftSync } from '@/lib/route-draft'

export function AppLayout() {
  // route-draft syncs to the server on a debounce (see db-sync.ts) — flush
  // any pending push immediately when the user leaves so an edit made just
  // before navigating away/closing the tab isn't dropped mid-debounce.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') flushRouteDraftSync()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', flushRouteDraftSync)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', flushRouteDraftSync)
    }
  }, [])

  return (
    <div className="flex h-dvh flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SidebarNav />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
