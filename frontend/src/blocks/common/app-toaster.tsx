import { Toaster } from '@/components/ui/sonner'
import { useThemeStore } from '@/store/theme-store'

export function AppToaster() {
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme)
  // offset.top clears the sticky TopBar (h-14 = 56px) so toasts never cover
  // its buttons; closeButton lets users dismiss without waiting it out.
  // sonner applies `mobileOffset` (not `offset`) below its own 600px
  // breakpoint, so both need to be set or narrow viewports fall back to the
  // library's 16px default and the toast covers the header again.
  return (
    <Toaster
      theme={resolvedTheme}
      position="top-center"
      offset={{ top: 64 }}
      mobileOffset={{ top: 64 }}
      closeButton
    />
  )
}
