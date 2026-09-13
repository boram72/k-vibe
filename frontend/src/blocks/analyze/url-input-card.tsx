import { AlertCircle, Camera, Search, Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { detectSnsPlatform, extractVideoId, getThumbnailUrl } from '@/lib/youtube'
import { cn } from '@/lib/utils'

interface UrlInputCardProps {
  url: string
  onUrlChange: (url: string) => void
  onAnalyze: () => void
  isAnalyzing: boolean
}

// 2026-09: 상단 "YouTube 준비됨"/"Instagram 대기 중" 배지와 예시 URL 목록을
// 제거했다(사용자 피드백 — 화면이 번잡함). 실제 지원 범위(YouTube만 분석,
// Instagram은 감지만)는 URL을 입력했을 때 나오는 아래 안내(unsupported_url /
// instagram_pending_*)로 그 시점에 전달하는 걸로 충분하다.
export function UrlInputCard({ url, onUrlChange, onAnalyze, isAnalyzing }: UrlInputCardProps) {
  const { t } = useTranslation()

  const platform = detectSnsPlatform(url)
  const isYoutube = platform === 'youtube'
  const isInstagram = platform === 'instagram'
  const videoId = url ? extractVideoId(url) : null
  const urlValid = isYoutube && Boolean(videoId)
  const InputIcon = isInstagram ? Camera : Video

  return (
    <div className="space-y-3">
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
    </div>
  )
}
