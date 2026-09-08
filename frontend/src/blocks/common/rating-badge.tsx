import { Star } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchPlaceReviews } from '@/api/reviews'
import { cn } from '@/lib/utils'

interface RatingBadgeProps {
  placeId: string
  className?: string
}

// Shares the same `['place-reviews', placeId]` query key as PlaceReviewTab,
// so this doesn't trigger an extra fetch when the review tab has already
// loaded that place's reviews — just reads the cached result. Renders
// nothing when there are no reviews yet, same "stay invisible until there's
// real data" pattern as StopCharacterImage.
export function RatingBadge({ placeId, className }: RatingBadgeProps) {
  const { data: reviews } = useQuery({
    queryKey: ['place-reviews', placeId],
    queryFn: () => fetchPlaceReviews(placeId),
  })

  if (!reviews || reviews.length === 0) return null

  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length

  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-foreground', className)}>
      <Star className="h-3 w-3 fill-primary text-primary" />
      {average.toFixed(1)}
      <span className="font-normal text-muted-foreground">({reviews.length})</span>
    </span>
  )
}
