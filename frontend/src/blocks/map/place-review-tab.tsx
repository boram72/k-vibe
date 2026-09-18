import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertCircle, MessageSquare, Pencil, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/lib/use-auth'
import { cn } from '@/lib/utils'
import { fetchPlaceReviews, createPlaceReview, deletePlaceReview, updatePlaceReview, type PlaceReview } from '@/api/reviews'
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

// blocks/common/loading-skeleton.tsx's CardSkeleton always includes an image
// block, which doesn't match a review card (no image) — reuse the shadcn
// Skeleton primitive it's built on instead, shaped like the actual review
// card (username/stars row + content line + date line) rather than a raw
// `animate-pulse` div.
function ReviewSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1.5 h-2.5 w-14" />
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
  // 내 리뷰 수정 — 목록 안에서 그 카드만 인라인으로 편집 폼으로 바뀜
  // (profile-header.tsx의 이름 편집과 동일한 "pencil 아이콘 → 인라인 폼" 패턴).
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)
  const [editRating, setEditRating] = useState(5)
  const [editContent, setEditContent] = useState('')
  // 삭제는 되돌릴 수 없어서 route.clear_route 확인 다이얼로그와 동일하게
  // Dialog로 한 번 더 확인받는다. 대상 review id가 있으면 다이얼로그가 열림.
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const reviewsQuery = useQuery({
    queryKey: ['place-reviews', placeId],
    queryFn: () => fetchPlaceReviews(placeId),
  })

  const mutation = useMutation({
    mutationFn: () => createPlaceReview(placeId, user!.id, rating, content.trim()),
    onSuccess: () => {
      setContent('')
      setRating(5)
      queryClient.invalidateQueries({ queryKey: ['place-reviews', placeId] })
      toast.success(t('placeDetail.review_submitted'))
    },
    onError: () => toast.error(t('placeDetail.review_submit_error')),
  })

  const updateMutation = useMutation({
    mutationFn: () => updatePlaceReview(placeId, editingReviewId!, user!.id, editRating, editContent.trim()),
    onSuccess: () => {
      setEditingReviewId(null)
      queryClient.invalidateQueries({ queryKey: ['place-reviews', placeId] })
      toast.success(t('placeDetail.review_updated'))
    },
    onError: () => toast.error(t('placeDetail.review_update_error')),
  })

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => deletePlaceReview(placeId, reviewId, user!.id),
    onSuccess: () => {
      setDeleteTargetId(null)
      queryClient.invalidateQueries({ queryKey: ['place-reviews', placeId] })
      toast.success(t('placeDetail.review_deleted'))
    },
    onError: () => toast.error(t('placeDetail.review_delete_error')),
  })

  function handleSubmit() {
    if (!user || !content.trim()) return
    mutation.mutate()
  }

  function startEditing(review: PlaceReview) {
    setEditingReviewId(review.id)
    setEditRating(review.rating)
    setEditContent(review.content)
  }

  function handleSaveEdit() {
    if (!user || !editContent.trim()) return
    updateMutation.mutate()
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
            <ReviewSkeleton key={i} />
          ))}
        </div>
      )}

      {reviewsQuery.isError && (
        // 2026-09 버그 수정 — 예전엔 실패해도 조용히 mock으로 새서 사용자가
        // 실패 자체를 몰랐음(FRONTEND_TODO_map_pan_search.md). 이제는 실패를
        // 그대로 보여주고 재시도할 수 있게 한다.
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-xs font-semibold text-foreground">{t('common.error_title')}</p>
          <p className="text-xs text-muted-foreground">{t('common.error_desc')}</p>
          <Button variant="outline" size="sm" onClick={() => reviewsQuery.refetch()}>
            {t('common.retry_btn')}
          </Button>
        </div>
      )}

      {!reviewsQuery.isPending && !reviewsQuery.isError && (reviewsQuery.data ?? []).length === 0 && (
        <div className="flex flex-col items-center gap-1.5 py-6 text-center">
          <MessageSquare className="h-5 w-5 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">{t('placeDetail.review_empty')}</p>
        </div>
      )}

      {!reviewsQuery.isPending && !reviewsQuery.isError && (reviewsQuery.data ?? []).length > 0 && (
        <div className="space-y-2">
          {reviewsQuery.data!.map((review) => {
            const isMine = user?.id === review.username
            const isEditing = editingReviewId === review.id

            if (isEditing) {
              return (
                <div key={review.id} className="space-y-2 rounded-xl border border-border bg-muted/50 p-3">
                  <StarRatingInput value={editRating} onChange={setEditRating} disabled={updateMutation.isPending} />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    disabled={updateMutation.isPending}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" disabled={updateMutation.isPending} onClick={() => setEditingReviewId(null)}>
                      {t('common.cancel')}
                    </Button>
                    <Button size="sm" disabled={!editContent.trim() || updateMutation.isPending} onClick={handleSaveEdit}>
                      {t('placeDetail.review_save')}
                    </Button>
                  </div>
                </div>
              )
            }

            return (
              <div key={review.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">{review.displayName ?? review.username}</p>
                  <div className="flex items-center gap-2">
                    <StarRatingDisplay rating={review.rating} />
                    {isMine && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEditing(review)}
                          aria-label={t('placeDetail.review_edit')}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(review.id)}
                          aria-label={t('placeDetail.review_delete')}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-1.5 text-sm leading-5 text-foreground/90">{review.content}</p>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString(i18n.language as Locale)}
                </p>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="p-6 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('placeDetail.review_delete_confirm_title')}</DialogTitle>
            <DialogDescription>{t('placeDetail.review_delete_confirm_desc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={deleteMutation.isPending} onClick={() => setDeleteTargetId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
            >
              {t('placeDetail.review_delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
