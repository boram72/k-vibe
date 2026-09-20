import { useMemo } from 'react'
import { Check, Clock, Heart, MapPin, Phone, Route } from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { CrowdBadge } from '@/blocks/common/crowd-badge'
import { RatingBadge } from '@/blocks/common/rating-badge'
import { PlaceReviewTab } from '@/blocks/map/place-review-tab'
import { addStopToRouteDraft, isPlaceInRouteDraft } from '@/lib/route-draft'
import { useMediaQuery } from '@/lib/use-media-query'
import { fetchPlaceDetail } from '@/api/places'
import { getCategoryLabelKey, type Place } from '@/types/place'

interface PlaceDetailSheetProps {
  place: Place | null
  saved: boolean
  onClose: () => void
  onToggleSave: (id: string) => void
}

// 대화 중 요청 — 핸드오프(페르소나/내 루트/SNS 분석기)로 들어온 방문의 "돌아가기"는
// 이 팝업 안이 아니라 지도 위 버튼(MapCanvas의 GoBackButton)이 맡는다. 그래서
// 이 팝업의 하단은 어디서 왔든 [찜] + [루트에 추가]이고, 이미 내 루트에 담긴 장소면
// [루트에 추가] 자리에 비활성 "추가됨"이 나온다(내 루트에서 넘어온 장소는 항상 그렇다).
export function PlaceDetailSheet({ place, saved, onClose, onToggleSave }: PlaceDetailSheetProps) {
  const { t } = useTranslation()
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // 이미 루트에 있는 장소에서 [루트에 추가]를 다시 누르면 토스트만 "이미 추가된 루트예요"인데도
  // 루트 순서가 바뀌던 문제가 있어서, 담긴 장소는 아예 누를 수 없게 한다. 팝업은 열릴 때마다
  // place가 null → 장소로 바뀌므로(담고 나면 onClose) 그때마다 다시 계산된다.
  const inRoute = useMemo(() => (place ? isPlaceInRouteDraft({ ...place, placeId: place.id }) : false), [place])

  // Fetched on demand per place (not part of the list response) — see
  // PLACE_DETAIL_INTEGRATION_REQUEST.md. Hook must run unconditionally
  // (before the `if (!place) return null` below), so it's gated by `enabled`
  // instead of an early return.
  const { data: detail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['place-detail', place?.id],
    queryFn: () => fetchPlaceDetail(place!.id, place!.lat, place!.lng, place!.name),
    enabled: place !== null,
  })

  function handleAddToRoute() {
    if (!place) return
    const { added } = addStopToRouteDraft({
      id: place.id,
      placeId: place.id,
      name: place.name,
      category: place.category,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      crowdLevel: place.crowdLevel,
    })
    toast.success(added ? t('placeDetail.added_to_route') : t('common.already_in_route'))
    onClose()
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
    <div className="flex flex-wrap items-center gap-2">
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
    <div className="space-y-1.5 text-sm">
      {isDetailLoading && <div className="h-4 w-40 animate-pulse rounded bg-muted" />}
      {detail?.phone &&
        (detail.phone === '-' ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0 text-primary" />
            {t('placeDetail.info_unavailable')}
          </p>
        ) : (
          <a href={`tel:${detail.phone}`} className="flex items-center gap-2 text-foreground hover:underline">
            <Phone className="h-4 w-4 shrink-0 text-primary" />
            {detail.phone}
          </a>
        ))}
      {detail?.businessHours && (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0 text-primary" />
          {detail.businessHours === '-' ? t('placeDetail.info_unavailable') : detail.businessHours}
        </p>
      )}
    </div>
  )

  // 상세(기존 정보/뱃지)와 리뷰를 탭으로 분리 — 요청 순서대로 "상세"가 먼저, "리뷰"가
  // 다음. 리뷰는 비로그인 사용자도 볼 수 있어야 해서 탭 자체는 항상 노출하고, 작성
  // 폼만 PlaceReviewTab 내부에서 로그인 여부로 게이팅한다.
  const tabsSection = (
    <Tabs defaultValue="detail" className="px-4">
      <TabsList className="w-full">
        <TabsTrigger value="detail" className="flex-1">
          {t('placeDetail.tab_detail')}
        </TabsTrigger>
        <TabsTrigger value="reviews" className="flex-1">
          {t('placeDetail.tab_reviews')}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="detail" className="space-y-1.5 pt-3">
        {info}
        {badges}
      </TabsContent>
      <TabsContent value="reviews" className="max-h-[45vh] overflow-y-auto pt-3">
        <PlaceReviewTab placeId={place.id} />
      </TabsContent>
    </Tabs>
  )

  const footer = (
    <>
      <Button variant={saved ? 'default' : 'outline'} className="flex-1" onClick={() => onToggleSave(place.id)}>
        <Heart className={saved ? 'fill-current' : ''} />
        {saved ? t('common.unsave') : t('common.save')}
      </Button>
      {inRoute ? (
        // 누를 수 없는 상태 표시 — SNS 결과 카드의 핑크 "추가됨"과 같은 색. disabled의 흐림(opacity-50)은 끈다.
        <Button variant="outline" className="flex-1 border-pink-500 bg-pink-500 text-white disabled:opacity-100" disabled>
          <Check />
          {t('placeDetail.added_label')}
        </Button>
      ) : (
        <Button variant="outline" className="flex-1" onClick={handleAddToRoute}>
          <Route />
          {t('placeDetail.add_to_route')}
        </Button>
      )}
    </>
  )

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{place.name}</DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2">
              <span>{place.address === '-' ? t('placeDetail.info_unavailable') : place.address}</span>
              <RatingBadge placeId={place.id} />
            </DialogDescription>
          </DialogHeader>
          {media}
          {tabsSection}
          <DialogFooter className="flex-row gap-2 sm:justify-stretch">
            {footer}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      {/* 리뷰 탭까지 열리면(헤더+사진+탭+리뷰+푸터 합) 화면 높이를 넘어서 시트가
          위로 계속 자라고, 그러면 시트 자기 자신 기준 top-3에 고정된 닫기(X)
          버튼이 화면 밖으로 밀려나 사라졌음 — 시트 전체를 85vh로 캡하고
          내부(사진+탭)만 스크롤되게 해서 헤더/푸터/닫기버튼은 항상 화면 안에
          고정되도록 수정. */}
      <SheetContent side="bottom" className="mx-auto flex max-h-[85vh] max-w-md flex-col overflow-hidden rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{place.name}</SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2">
            <span>{place.address === '-' ? t('placeDetail.info_unavailable') : place.address}</span>
            <RatingBadge placeId={place.id} />
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {media}
          {tabsSection}
        </div>
        <SheetFooter className="flex-row gap-2">{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
