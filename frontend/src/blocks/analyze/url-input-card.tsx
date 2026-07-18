import { AlertCircle, Camera, Search, Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { detectSnsPlatform, extractVideoId, getThumbnailUrl } from '@/lib/youtube'
import { EXAMPLE_URLS } from './analyze.data'
import { cn } from '@/lib/utils'

interface UrlInputCardProps {
  url: string
  onUrlChange: (url: string) => void
  onAnalyze: () => void
  isAnalyzing: boolean
  onSelectExample: (url: string) => void
}

export function UrlInputCard({ url, onUrlChange, onAnalyze, isAnalyzing, onSelectExample }: UrlInputCardProps) {
  const { t } = useTranslation()

  const platform = detectSnsPlatform(url)
  const isYoutube = platform === 'youtube'
  const isInstagram = platform === 'instagram'
  const videoId = url ? extractVideoId(url) : null
  const urlValid = isYoutube && Boolean(videoId)
  const InputIcon = isInstagram ? Camera : Video

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
          <Video className="h-3 w-3" />
          {t('analyze.youtube_supported')}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          <Camera className="h-3 w-3" />
          {t('analyze.instagram_pending')}
        </span>
      </div>

      <div className="relative">
        <InputIcon
          className={cn(
            'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2',
            isInstagram ? 'text-pink-400' : 'text-destructive',
          )}
        />
        <input
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder={t('analyze.input_placeholder')}
          className="w-full rounded-xl border border-border bg-muted py-3 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
        />
      </div>

      {url && !urlValid && !isInstagram && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {isYoutube ? t('analyze.invalid_url') : t('analyze.unsupported_url')}
        </p>
      )}

      {isInstagram && (
        <div className="flex items-start gap-2 rounded-xl border border-pink-400/20 bg-pink-400/10 p-3">
          <Camera className="mt-0.5 h-4 w-4 shrink-0 text-pink-400" />
          <div>
            <p className="text-xs font-semibold text-pink-200">{t('analyze.instagram_pending_title')}</p>
            <p className="mt-1 text-xs leading-5 text-pink-200/70">{t('analyze.instagram_pending_body')}</p>
          </div>
        </div>
      )}

      {videoId && (
        <div className="relative h-32 overflow-hidden rounded-xl bg-muted">
          <img
            src={getThumbnailUrl(videoId)}
            alt={t('analyze.thumbnail_alt')}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
            <Video className="h-3 w-3 text-destructive" />
            <span className="font-mono text-xs text-white/80">{videoId}</span>
          </div>
        </div>
      )}

      <Button className="w-full" disabled={!urlValid || isAnalyzing} onClick={onAnalyze}>
        <Search className="h-4 w-4" />
        {isAnalyzing ? t('analyze.loading_button') : t('analyze.analyze_button')}
      </Button>

      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">{t('analyze.examples_label')}</p>
        <div className="space-y-2">
          {EXAMPLE_URLS.map((exampleUrl) => {
            const exPlatform = detectSnsPlatform(exampleUrl)
            const ExampleIcon = exPlatform === 'instagram' ? Camera : Video
            const platformLabel =
              exPlatform === 'instagram' ? t('analyze.instagram_pending') : t('analyze.youtube_supported')

            return (
              <button
                key={exampleUrl}
                type="button"
                onClick={() => onSelectExample(exampleUrl)}
                disabled={isAnalyzing}
                className="flex w-full items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-left transition-colors hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    exPlatform === 'instagram' ? 'bg-pink-400/10 text-pink-400' : 'bg-destructive/10 text-destructive',
                  )}
                >
                  <ExampleIcon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-foreground">{platformLabel}</span>
                  <span className="block truncate font-mono text-[11px] text-muted-foreground">{exampleUrl}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
