import { useEffect, useRef, useState } from 'react'
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
//
// 대화 중 발견한 버그(8-2) 대응 — spot-list-panel.tsx가 목록의 place 전부를
// 가상화 없이 한 번에 렌더링해서, 반경검색 결과가 30~40개면 이 컴포넌트도
// 30~40개가 동시에 마운트되어 GET /reviews/{placeId}가 한꺼번에 몰려
// 백엔드가 503을 내는 문제가 있었음(리뷰 하나당 Supabase 조회가 2번이라
// 실제 부하는 그 두 배). 근본 해결(요청을 1번으로 묶는 배치 API/목록 API에
// 평점 포함)은 백엔드도 같이 손봐야 해서 범위가 커, 우선 프론트만으로 완화
// 가능한 방법 — IntersectionObserver로 카드가 실제로 화면에(또는 근처에)
// 들어왔을 때만 쿼리를 활성화(`enabled`)한다. 한 번 보인 카드는 계속
// enabled 상태로 유지(다시 스크롤해서 안 보여도 refetch 안 함 — 쿼리
// 캐시(staleTime 5분)에 맡김), observer도 그 시점에 disconnect.
export function RatingBadge({ placeId, className }: RatingBadgeProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isVisible) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setIsVisible(true)
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isVisible])

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['place-reviews', placeId],
    queryFn: () => fetchPlaceReviews(placeId),
    enabled: isVisible,
  })

  // 화면에 들어오기 전(또는 요청이 아직 진행 중)엔 관측용 빈 span을 유지한다
  // — ref가 사라지면 IntersectionObserver가 그 카드를 다시는 못 봐서 영영
  // 리뷰를 못 불러온다. 로딩이 끝나 리뷰가 0개로 확정되면(이미 isVisible이라
  // 더 관측할 필요 없음) 기존과 동일하게 완전히 사라진다.
  if (isVisible && !isLoading && (!reviews || reviews.length === 0)) return null
  if (!isVisible || isLoading || !reviews) {
    return <span ref={ref} aria-hidden className={className} />
  }

  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length

  return (
    <span
      ref={ref}
      className={cn('inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-foreground', className)}
    >
      <Star className="h-3 w-3 fill-primary text-primary" />
      {average.toFixed(1)}
      <span className="font-normal text-muted-foreground">({reviews.length})</span>
    </span>
  )
}
