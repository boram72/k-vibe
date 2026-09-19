import { useTranslation } from 'react-i18next'
import { Play } from 'lucide-react'
import { POPULAR_VIDEOS } from './popular-videos.data'

interface PopularVideosProps {
  onSelect: (url: string) => void
}

export function PopularVideos({ onSelect }: PopularVideosProps) {
  const { t } = useTranslation()

  return (
    <div className="rounded-xl border border-border bg-muted p-3" data-tour="analyze-popular-videos">
      <p className="text-xs font-semibold text-foreground/80">{t('analyze.popular_videos_title')}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{t('analyze.popular_videos_subtitle')}</p>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {POPULAR_VIDEOS.map((video) => (
          <button
            key={video.videoId}
            type="button"
            onClick={() => onSelect(`https://www.youtube.com/watch?v=${video.videoId}`)}
            className="group overflow-hidden rounded-lg border border-border bg-background text-left transition-colors hover:border-primary/50"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-muted">
              <img
                src={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
                alt={t(video.labelKey)}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                <Play className="h-5 w-5 fill-white text-white" />
              </div>
            </div>
            <p className="truncate px-1.5 py-1 text-center font-semibold text-foreground">{t(video.labelKey)}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
