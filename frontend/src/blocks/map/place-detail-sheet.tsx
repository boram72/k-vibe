import { Clock, Heart, MapPin, Phone, Plus, Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CrowdBadge } from '@/blocks/common/crowd-badge'
import { addStopToRouteDraft } from '@/lib/route-draft'
import { useMediaQuery } from '@/lib/use-media-query'
import { fetchPlaceDetail } from '@/api/places'
import { getCategoryLabelKey, type Place } from '@/types/place'

interface PlaceDetailSheetProps {
  place: Place | null
  saved: boolean
  onClose: () => void
  onToggleSave: (id: string) => void
}

export function PlaceDetailSheet({ place, saved, onClose, onToggleSave }: PlaceDetailSheetProps) {
  const { t } = useTranslation()
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // Fetched on demand per place (not part of the list response) — see
  // PLACE_DETAIL_INTEGRATION_REQUEST.md. Hook must run unconditionally
  // (before the `if (!place) return null` below), so it's gated by `enabled`
  // instead of an early return.
  const { data: detail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['place-detail', place?.id],
    queryFn: () => fetchPlaceDetail(place!.id),
    enabled: place !== null,
  })

  function handleAddToRoute() {
    if (!place) return
    addStopToRouteDraft({
      id: place.id,
      placeId: place.id,
      name: place.name,
      category: place.category,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      crowdLevel: place.crowdLevel,
    })
    toast.success(t('placeDetail.added_to_route'))
    onClose()
  }

  async function handleShare() {
    if (!place) return
    const url = `${window.location.origin}${window.location.pathname}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('placeDetail.share_copied'))
    } catch {
      toast.error(t('common.error_title'))
    }
  }

  if (!place) return null

  const media = place.imageUrl ? (
    <img src={place.imageUrl} alt={place.name} className="h-32 w-full rounded-xl object-cover" />
  ) : (
    <div className="flex h-32 items-center justify-center rounded-xl bg-muted text-primary/40">
      <MapPin className="h-8 w-8" />
    </div>
  )

  const badges = (
    <div className="flex flex-wrap items-center gap-2 px-4">
      {place.crowdLevel && <CrowdBadge level={place.crowdLevel} />}
      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        {t(getCategoryLabelKey(place.category))}
      </span>
      {/* detail?.tags (TourAPI cat3, fetched on demand) takes priority once loaded;
          place.tags covers mock/home-feed data that already has tags at list time. */}
      {(detail?.tags ?? place.tags)?.map((tag) => (
        <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          {tag}
        </span>
      ))}
    </div>
  )

  // Phone/hours aren't in the list response (fetched on demand — see the
  // useQuery above), so this section is empty while loading or if the
  // backend has nothing for this place, not shown as an error.
  const info = (isDetailLoading || detail?.phone || detail?.businessHours) && (
    <div className="space-y-1.5 px-4 text-sm">
      {isDetailLoading && <div className="h-4 w-40 animate-pulse rounded bg-muted" />}
      {detail?.phone && (
        <a href={`tel:${detail.phone}`} className="flex items-center gap-2 text-foreground hover:underline">
          <Phone className="h-4 w-4 shrink-0 text-primary" />
          {detail.phone}
        </a>
      )}
      {detail?.businessHours && (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0 text-primary" />
          {detail.businessHours}
        </p>
      )}
    </div>
  )

  const footer = (
    <>
      <Button variant={saved ? 'default' : 'outline'} className="flex-1" onClick={() => onToggleSave(place.id)}>
        <Heart className={saved ? 'fill-current' : ''} />
        {saved ? t('common.unsave') : t('common.save')}
      </Button>
      <Button variant="outline" className="flex-1" onClick={handleAddToRoute}>
        <Plus />
        {t('placeDetail.add_to_route')}
      </Button>
      <Button variant="outline" size="icon" onClick={handleShare} aria-label={t('placeDetail.share')}>
        <Share2 />
      </Button>
    </>
  )

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          {media}
          <DialogHeader>
            <DialogTitle>{place.name}</DialogTitle>
            <DialogDescription>{place.address}</DialogDescription>
          </DialogHeader>
          {info}
          {badges}
          <DialogFooter className="flex-row gap-2 sm:justify-stretch">
            {footer}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-2xl">
        {media}
        <SheetHeader>
          <SheetTitle>{place.name}</SheetTitle>
          <SheetDescription>{place.address}</SheetDescription>
        </SheetHeader>
        {info}
        {badges}
        <SheetFooter className="flex-row gap-2">{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
