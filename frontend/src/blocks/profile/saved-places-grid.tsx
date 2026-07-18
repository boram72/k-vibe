import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, Map, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchSavedPlaces, toggleSavedPlace } from '@/lib/saved-places'
import { getCategoryLabelKey, type Place } from '@/types/place'
import type { MapFocusState } from '@/pages/MapPage'

const PREVIEW_LIMIT = 4

export function SavedPlacesGrid() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAll, setShowAll] = useState(false)

  const { data: places = [] } = useQuery({ queryKey: ['saved-places'], queryFn: fetchSavedPlaces })
  const unsaveMutation = useMutation({
    mutationFn: toggleSavedPlace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-places'] }),
  })

  function openPlace(place: Place) {
    const state: MapFocusState = { focusPlaces: [place], openDetail: true }
    navigate('../map', { state })
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

  const visible = showAll ? places : places.slice(0, PREVIEW_LIMIT)

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Heart className="h-4 w-4 text-primary" />
          {t('profile.saved_places')}
        </h2>
        {places.length > PREVIEW_LIMIT && (
          <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? t('profile.show_less') : t('profile.see_all')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {visible.map((place) => (
          <div key={place.id} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
            <button
              type="button"
              onClick={() => openPlace(place)}
              aria-label={t('profile.open_saved_detail', { name: place.name })}
              className="absolute inset-0 text-left"
            >
              <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary/40">
                <MapPin className="h-7 w-7" />
              </div>
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
          </div>
        ))}
      </div>
    </section>
  )
}
