import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Heart, Map, MapPin } from 'lucide-react'
import { CrowdBadge } from '@/blocks/common/crowd-badge'
import { cn } from '@/lib/utils'
import type { Place } from '@/types/place'

function formatDistance(meters?: number) {
  if (meters === undefined) return ''
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`
}

interface PlaceCardProps {
  place: Place
  saved: boolean
  onToggleSave: (id: string) => void
  className?: string
}

export function PlaceCard({ place, saved, onToggleSave, className }: PlaceCardProps) {
  const { t } = useTranslation()
  const distance = formatDistance(place.distanceM)

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
    >
      <Link to="map">
        <div className="relative h-32 bg-muted">
          {place.imageUrl ? (
            <img
              src={place.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary/40">
              <MapPin className="h-8 w-8" />
            </div>
          )}

          {place.crowdLevel && (
            <CrowdBadge
              level={place.crowdLevel}
              className="absolute left-2 top-2 bg-background/80 backdrop-blur"
            />
          )}

          <button
            type="button"
            onClick={() => onToggleSave(place.id)}
            aria-label={saved ? t("common.unsave") : t("common.save")}
            className={cn(
              "absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur transition-colors",
              saved ? "text-primary" : "text-foreground",
            )}
          >
            <Heart className={cn("h-4 w-4", saved && "fill-current")} />
          </button>
        </div>

        <div className="space-y-2 p-3">
          <div>
            <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
              {place.name}
            </h3>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {place.address}
            </p>
            {distance && (
              <p className="mt-0.5 text-xs font-medium text-primary">
                {distance}
              </p>
            )}
          </div>

          <div className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-muted py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted/70">
            <Map className="h-3.5 w-3.5" />
            {t("homeFeed.openMap")}
          </div>
        </div>
      </Link>
    </article>
  );
}
