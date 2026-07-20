import { useState, type ComponentType, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useAuth } from '@/lib/use-auth'
import type { AuthProvider } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { GoogleIcon } from '@/assets/google-icon'

const inputClassName =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PROVIDER_BUTTONS: {
  id: AuthProvider
  labelKey: string
  className: string
  icon: ComponentType<{ className?: string }>
}[] = [
  { id: 'google', labelKey: 'login.continue_google', className: 'border border-border bg-background text-foreground hover:bg-accent', icon: GoogleIcon },
  { id: 'kakao', labelKey: 'login.continue_kakao', className: 'bg-[#FEE500] text-black hover:bg-[#FEE500]/90', icon: MessageCircle },
]

// Same UI on mobile and desktop — three provider buttons + a guest CTA don't
// need a layout split the way RoutePage/ProfilePage do.
export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const { t } = useTranslation()
  const {
    login,
    isLoggingIn,
    signup,
    isSigningUp,
    signupError,
    loginWithCredentials,
    isLoggingInWithCredentials,
    loginCredentialsError,
  } = useAuth()
  const guestFeatures = t('login.guest_features', { returnObjects: true }) as string[]

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [nationality, setNationality] = useState('')
  const [email, setEmail] = useState('')

  const isSubmitting = isSigningUp || isLoggingInWithCredentials
  const credentialsError = signupError || loginCredentialsError

  function handleLogin(provider: AuthProvider) {
    login(provider, { onSuccess: () => onOpenChange(false) })
  }

  function handleCredentialsSubmit(event: FormEvent) {
    event.preventDefault()
    const onSuccess = () => onOpenChange(false)
    if (mode === 'signup') {
      signup({ username, nationality, email, password }, { onSuccess })
    } else {
      loginWithCredentials({ username, password }, { onSuccess })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('login.title')}</DialogTitle>
          <DialogDescription>{t('login.subtitle')}</DialogDescription>
        </DialogHeader>

        {mode === 'login' && (
          <>
            <div className="space-y-2">
              {PROVIDER_BUTTONS.map(({ id, labelKey, className, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  disabled={isLoggingIn}
                  onClick={() => handleLogin(id)}
                  className={cn(
                    'flex w-full items-center justify-center gap-3 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-60',
                    className,
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {t(labelKey)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              {t('login.credentials_divider')}
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={handleCredentialsSubmit} className="space-y-2">
          <input
            className={inputClassName}
            placeholder={t('login.username_label')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {mode === 'signup' && (
            <>
              <input
                className={inputClassName}
                placeholder={t('login.nationality_label')}
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                required
              />
              <input
                className={inputClassName}
                type="email"
                placeholder={t('login.email_label')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </>
          )}
          <input
            className={inputClassName}
            type="password"
            placeholder={t('login.password_label')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {credentialsError && (
            <p className="text-xs text-destructive">{t('login.credentials_error')}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {mode === 'signup' ? t('login.signup_button') : t('login.login_credentials_button')}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {mode === 'signup' ? t('login.switch_to_login') : t('login.switch_to_signup')}
          </button>
        </form>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="w-full py-2 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t('login.continue_guest')}
        </button>

        <div className="space-y-1.5 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">{t('login.available_without_login')}</p>
          {guestFeatures.map((feature) => (
            <p key={feature} className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-crowd-low" />
              {feature}
            </p>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
