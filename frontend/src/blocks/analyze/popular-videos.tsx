import { useTranslation } from 'react-i18next'
import { Play } from 'lucide-react'

interface PopularVideo {
  videoId: string
  labelKey: string
}

// 한국관광공사 공식 채널(@VISITKOREA)의 "Feel the Rhythm of Korea" 시리즈 —
// 개인 크리에이터 영상 대신 이걸 쓴 이유: (1) 정부 공식 홍보 채널이라 저작권
// 문제가 사실상 없고, (2) 도시별로 실제 랜드마크가 뚜렷하게 나와서 SNS
// 분석기로 분석했을 때 장소가 잘 잡힐 가능성이 높다(사용자 요청).
const POPULAR_VIDEOS: PopularVideo[] = [
  { videoId: '3P1CnWI62Ik', labelKey: 'analyze.popular_video_seoul' },
  { videoId: 'xLD8oWRmlAE', labelKey: 'analyze.popular_video_busan' },
  { videoId: 'dqkfpKJw348', labelKey: 'analyze.popular_video_gyeongju' },
  { videoId: 'gux_pyEIcUY', labelKey: 'analyze.popular_video_jeju' },
  { videoId: 'ZRD2pqmHuK0', labelKey: 'analyze.popular_video_yeosu' },
  { videoId: '9VbMfTXkUCI', labelKey: 'analyze.popular_video_mokpo' },
]

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
