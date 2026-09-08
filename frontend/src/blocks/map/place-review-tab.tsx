import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MessageSquare, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/use-auth'
import { cn } from '@/lib/utils'
import { fetchPlaceReviews, createPlaceReview } from '@/api/reviews'
import type { Locale } from '@/i18n'

interface PlaceReviewTabProps {
  placeId: string
}

function StarRatingInput({ value, onChange, disabled }: { value: number; onChange: (next: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          className="disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`${star}`}
        >
          <Star className={cn('h-5 w-5', star <= value ? 'fill-primary text-primary' : 'text-muted-foreground/40')} />
        </button>
      ))}
    </div>
  )
}

function StarRatingDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={cn('h-3 w-3', star <= rating ? 'fill-primary text-primary' : 'text-muted-foreground/30')} />
      ))}
    </div>
  )
}

export function PlaceReviewTab({ placeId }: PlaceReviewTabProps) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')

  const reviewsQuery = useQuery({
    queryKey: ['place-reviews', placeId],
    queryFn: () => fetchPlaceReviews(placeId),
  })

  const mutation = useMutation({
    mutationFn: () => createPlaceReview(placeId, user!.name, rating, content.trim()),
    onSuccess: () => {
      setContent('')
      setRating(5)
      queryClient.invalidateQueries({ queryKey: ['place-reviews', placeId] })
      toast.success(t('placeDetail.review_submitted'))
    },
    onError: () => toast.error(t('common.error_title')),
  })

  function handleSubmit() {
    if (!user || !content.trim()) return
    mutation.mutate()
  }

  return (
    <div className="space-y-4 pb-2">
      <div className="space-y-2 rounded-xl border border-border bg-muted/50 p-3">
        <StarRatingInput value={rating} onChange={setRating} disabled={!user || mutation.isPending} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={!user || mutation.isPending}
          placeholder={user ? t('placeDetail.review_placeholder') : t('placeDetail.review_login_required')}
          rows={2}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        />
        <Button
          size="sm"
          className="w-full"
          disabled={!user || !content.trim() || mutation.isPending}
          onClick={handleSubmit}
        >
          {t('placeDetail.review_submit')}
        </Button>
      </div>

      {reviewsQuery.isPending && (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {!reviewsQuery.isPending && (reviewsQuery.data ?? []).length === 0 && (
        <div className="flex flex-col items-center gap-1.5 py-6 text-center">
          <MessageSquare className="h-5 w-5 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">{t('placeDetail.review_empty')}</p>
        </div>
      )}

      {!reviewsQuery.isPending && (reviewsQuery.data ?? []).length > 0 && (
        <div className="space-y-2">
          {reviewsQuery.data!.map((review) => (
            <div key={review.id} className="rounded-xl border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">{review.username}</p>
                <StarRatingDisplay rating={review.rating} />
              </div>
              <p className="mt-1.5 text-sm leading-5 text-foreground/90">{review.content}</p>
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString(i18n.language as Locale)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
