import { Flame } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchTrendingKeywords } from '@/api/trending'

export function TrendingKeywords() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: keywords = [] } = useQuery({
    queryKey: ['trending-keywords'],
    queryFn: fetchTrendingKeywords,
  })

  // Tapping a keyword hands off to MapPage with that keyword pre-filled in
  // the search box (same `MapFocusState`-style one-time router state as the
  // Analyze/Persona/Radar "view on map" handoffs) — reuses the existing
  // name/address/tag search filter instead of a dedicated keyword search.
  function handleSelect(keyword: string) {
    navigate('map', { state: { initialSearch: keyword } })
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Flame className="h-3.5 w-3.5" />
        {t('landing.trending_now')}
      </p>
      <div className="flex flex-wrap gap-2">
        {keywords.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => handleSelect(tag)}
            className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  )
}
