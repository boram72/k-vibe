import { Outlet } from 'react-router-dom'
import { TopBar } from './top-bar'
import { SidebarNav } from './sidebar-nav'
import { BottomNav } from './bottom-nav'
import { ErrorBoundary } from '@/blocks/common/error-boundary'

export function AppLayout() {
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
