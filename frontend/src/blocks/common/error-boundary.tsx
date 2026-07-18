import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <p className="font-semibold text-foreground">{t('common.error_title')}</p>
      <p className="text-sm text-muted-foreground">{t('common.error_desc')}</p>
      <Button onClick={onRetry}>{t('common.retry_btn')}</Button>
    </div>
  )
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <ErrorFallback onRetry={this.handleRetry} />
    }
    return this.props.children
  }
}
