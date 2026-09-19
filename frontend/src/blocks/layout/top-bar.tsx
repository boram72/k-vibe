import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun, PanelLeft, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/store/theme-store'
import { useSidebarStore } from '@/store/sidebar-store'
import { useAuth } from '@/lib/use-auth'
import { PROFILE_POPUP_REOPEN_KEY } from '@/lib/auth'
import { LogoWordmark } from '@/assets/logo-wordmark'
import { ProfileDialog } from '@/blocks/profile/profile-dialog'
import { HelpButton } from './help-button'
import { LanguageDropdown } from './language-dropdown'

export function TopBar() {
  const { resolvedTheme, setTheme } = useThemeStore()
  const toggleSidebar = useSidebarStore((s) => s.toggle)
  const { user, isLoading } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const reopenHandledRef = useRef(false)

  // OAuth 리다이렉트로 페이지가 나갔다 돌아온 직후(auth.ts의
  // redirectToOAuthProvider 참고) — 로그인 완료됐으면 팝업을 자동으로 다시 연다.
  useEffect(() => {
    if (reopenHandledRef.current || isLoading) return
    reopenHandledRef.current = true
    if (sessionStorage.getItem(PROFILE_POPUP_REOPEN_KEY)) {
      sessionStorage.removeItem(PROFILE_POPUP_REOPEN_KEY)
      // lint 수정 — sessionStorage 읽기/삭제는 렌더 중엔 할 수 없는 부수효과라
      // effect에 남겨두되, setState 호출만 마이크로태스크로 미뤄
      // react-hooks/set-state-in-effect(동기 setState 금지)를 피한다.
      if (user) queueMicrotask(() => setProfileOpen(true))
    }
  }, [isLoading, user])

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="flex items-center gap-1">
        {/* md:-ml-2 — 헤더 자체 좌측 패딩(px-6=24px)을 상쇄해서 버튼(size-8=32px)
            좌측 끝이 16px에 오게 만들고, 그러면 아이콘 중심이 정확히 32px가 되어
            SidebarNav 접힌 상태 아이콘 중심(대화 중 Playwright 실측 32px)과
            세로로 한 줄 정렬된다(대화로 요청). 폭을 늘리지 않고 원래
            size-8 그대로 써서 로고와의 간격도 좁아짐(대화 후속 요청).
            gap-1(4px) 뒤 로고가 시작하는 지점(48+4=52px)은 SidebarNav 펼침
            상태의 텍스트 시작 지점(p-2 8px + px-3 12px + 아이콘 20px + gap-3
            12px = 52px)과 정확히 일치하도록 맞춤. */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:-ml-2 md:inline-flex"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Link to="." className="flex items-center text-foreground">
          <LogoWordmark className="h-9" />
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <HelpButton />
        <div data-tour="home-topbar-utils" className="flex items-center gap-2">
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
          <button type="button" onClick={() => setProfileOpen(true)} aria-label="Profile">
            <Avatar>
              <AvatarFallback>
                {user ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </header>
  )
}
