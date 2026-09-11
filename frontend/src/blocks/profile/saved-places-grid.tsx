// [ProfilePage에서 홈 화면으로 이동, 2026-09 태스크보드 1번/10번] "찜한 장소"를
// 프로필에서 빼서(10번) 홈 화면(1번)의 "찜한 장소" 카드로 재사용 중.
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Heart, Map, MapPin, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchSavedPlaces, toggleSavedPlace } from '@/lib/saved-places'
import { addStopToRouteDraft, readRouteDraft } from '@/lib/route-draft'
import { getCategoryLabelKey, type Place } from '@/types/place'
import type { MapFocusState } from '@/pages/MapPage'

// place-detail-sheet.tsx와 동일하게 실제 장소 사진(place.imageUrl)을 보여준다
// — 기존엔 항상 MapPin 아이콘 placeholder만 떠서 홈 화면에 올라오니 허전해
// 보인다는 피드백으로 추가. 이미지 로드 실패 시엔 기존 placeholder로 폴백.
function SavedPlaceImage({ place }: { place: Place }) {
  const [imageFailed, setImageFailed] = useState(false)

  if (place.imageUrl && !imageFailed) {
    return (
      <img
        src={place.imageUrl}
        alt={place.name}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className="h-full w-full object-cover"
      />
    )
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary/40">
      <MapPin className="h-7 w-7" />
    </div>
  )
}

export function SavedPlacesGrid() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // 팀 태스크보드 1번 — 이미 내 루트에 들어있는 장소는 "내 루트 추가" 버튼을
  // 숨긴다. readRouteDraft()는 localStorage 스냅샷이라 반응형이 아니므로,
  // 이 화면에서 추가한 것도 즉시 반영되도록 로컬 state로 따로 들고 있다가
  // 버튼 클릭 시 직접 갱신한다.
  const [routeStopIds, setRouteStopIds] = useState<Set<string>>(() => new Set(readRouteDraft().map((s) => s.id)))
  // 가로스크롤 행은 터치/트랙패드 스와이프는 기본으로 되지만 "마우스로 드래그"는
  // 브라우저가 기본 지원하지 않아서(그냥 텍스트 선택으로 처리됨) 직접 구현.
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!scrollRef.current) return
    dragRef.current = { startX: e.clientX, startScrollLeft: scrollRef.current.scrollLeft }
    scrollRef.current.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || !scrollRef.current) return
    scrollRef.current.scrollLeft = dragRef.current.startScrollLeft - (e.clientX - dragRef.current.startX)
  }

  function handlePointerUp() {
    dragRef.current = null
  }

  const { data: places = [] } = useQuery({ queryKey: ['saved-places'], queryFn: fetchSavedPlaces })
  const unsaveMutation = useMutation({
    mutationFn: toggleSavedPlace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-places'] }),
  })

  function openPlace(place: Place) {
    const state: MapFocusState = { focusPlaces: [place], openDetail: true }
    navigate('../map', { state })
  }

  function handleAddToRoute(place: Place) {
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
    setRouteStopIds((prev) => new Set(prev).add(place.id))
    toast.success(t('placeDetail.added_to_route'))
    navigate('../route')
  }

  if (places.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Heart className="h-4 w-4 text-primary" />
          {t('profile.saved_places')}
        </h2>
        <div className="rounded-xl border border-border bg-muted p-5 text-center">
          <p className="text-sm font-semibold text-foreground">{t('profile.no_saved_places')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('profile.no_saved_places_hint')}</p>
          <Button className="mt-4" onClick={() => navigate('../map')}>
            <Map className="h-3.5 w-3.5" />
            {t('profile.open_map')}
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Heart className="h-4 w-4 text-primary" />
        {t('profile.saved_places')}
      </h2>

      {/* 개수가 많아져도 그리드+더보기 대신 가로로 쭉 늘어놓고 스와이프/드래그로
          훑어보게 함(대화로 확정) — persona-picker.tsx와 동일한 가로스크롤 패턴. */}
      <div
        ref={scrollRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="-mx-4 flex cursor-grab gap-2 overflow-x-auto px-4 scrollbar-hide active:cursor-grabbing md:mx-0 md:px-0"
      >
        {places.map((place) => (
          <div
            key={place.id}
            className="relative aspect-square w-36 shrink-0 overflow-hidden rounded-xl border border-border bg-muted md:w-40"
          >
            <button
              type="button"
              onClick={() => openPlace(place)}
              aria-label={t('profile.open_saved_detail', { name: place.name })}
              className="absolute inset-0 text-left"
            >
              <SavedPlaceImage place={place} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <span className="absolute left-2 top-2 rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground backdrop-blur">
                {t(getCategoryLabelKey(place.category))}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-2.5">
                <p className="line-clamp-2 text-sm font-bold leading-5 text-white">{place.name}</p>
                <p className="mt-1 truncate text-[11px] text-white/70">{place.address}</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => unsaveMutation.mutate(place)}
              aria-label={t('common.unsave')}
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/70 text-primary backdrop-blur"
            >
              <Heart className="h-3.5 w-3.5 fill-current" />
            </button>
            {!routeStopIds.has(place.id) && (
              <button
                type="button"
                onClick={() => handleAddToRoute(place)}
                aria-label={t('placeDetail.add_to_route')}
                title={t('placeDetail.add_to_route')}
                className="absolute bottom-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/70 text-primary backdrop-blur"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
