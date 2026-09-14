import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { TopBar } from './top-bar'
import { SidebarNav } from './sidebar-nav'
import { BottomNav } from './bottom-nav'
import { ErrorBoundary } from '@/blocks/common/error-boundary'
import { flushRouteDraftSync } from '@/lib/route-draft'
import { useSidebarStore } from '@/store/sidebar-store'

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

  // SidebarNav(w-60/w-16, md+ only) sits left of <main>, so a `position:fixed`
  // overlay centered on the raw viewport (dialog.tsx's `left-1/2`) lands
  // visibly left of the content column's actual visual center (사용자 피드백:
  // "선택 팝업이 왼쪽으로 치우쳐져 있어"). Dialog/Sheet etc. portal to
  // document.body, outside this component's own DOM subtree, so a plain
  // inline style here wouldn't reach them via CSS inheritance -- write the
  // offset onto <html> instead, which the portaled content shares as an
  // ancestor. dialog.tsx reads this (with a `0px` fallback) only at the `md:`
  // breakpoint, where the sidebar is actually rendered.
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-offset', isCollapsed ? '64px' : '240px')
    return () => {
      document.documentElement.style.removeProperty('--sidebar-offset')
    }
  }, [isCollapsed])

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
