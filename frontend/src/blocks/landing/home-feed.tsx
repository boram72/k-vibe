import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { PlaceCard } from '@/blocks/common/place-card'
import { LoadingSkeleton } from '@/blocks/common/loading-skeleton'
import { PersonaChip } from '@/blocks/landing/persona-chip'
import { fetchHomeFeedPlaces } from '@/api/places'
import { STORY_TOPICS, FEED_CATEGORIES } from './home-feed.data'
import type { StoryTopic } from './home-feed.data'
import { getCategoryLabelKey, type PlaceCategory } from '@/types/place'
import { readPersonaPreference, getPersonaFeedCategory } from '@/lib/persona-preference'
import { fetchSavedPlaces, toggleSavedPlace } from '@/lib/saved-places'
import { cn } from '@/lib/utils'

export function HomeFeed() {
  const { t, i18n } = useTranslation()
  const [personaPreference] = useState(() => readPersonaPreference())
  const [category, setCategory] = useState<PlaceCategory>('all')
  const [activeStory, setActiveStory] = useState<StoryTopic | null>(null)

  const queryClient = useQueryClient()
  const { data: savedPlaces = [] } = useQuery({
    queryKey: ['saved-places'],
    queryFn: fetchSavedPlaces,
  })
  const savedIds = useMemo(() => new Set(savedPlaces.map((p) => p.id)), [savedPlaces])
  const toggleSaveMutation = useMutation({
    mutationFn: toggleSavedPlace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-places'] }),
  })

  // Derived (not a separate toggle state) so the chip's active look always
  // matches the actual filter — if the user picks a different category/story
  // another way, the chip automatically shows as inactive again.
  const personaCategory = personaPreference ? getPersonaFeedCategory(personaPreference) : null
  const isPersonaFilterActive = personaCategory !== null && category === personaCategory

  function togglePersonaFilter() {
    if (!personaCategory) return
    setActiveStory(null)
    setCategory(isPersonaFilterActive ? 'all' : personaCategory)
  }

  const { data: places = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['home-feed-places', i18n.language],
    queryFn: () => fetchHomeFeedPlaces(i18n.language),
  })

  const filtered = places.filter((place) => category === 'all' || place.category === category)

  function toggleSave(id: string) {
    const place = places.find((p) => p.id === id)
    if (place) toggleSaveMutation.mutate(place)
  }

  function selectStory(topic: StoryTopic, topicCategory: PlaceCategory) {
    setActiveStory(topic)
    setCategory(topicCategory)
  }

  return (
    <section className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t('homeFeed.eyebrow')}</p>
          <h2 className="mt-0.5 text-lg font-bold text-foreground">{t('homeFeed.title')}</h2>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          aria-label={t('homeFeed.refresh')}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
        >
          <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin text-primary')} />
        </button>
      </div>

      {personaPreference && (
        <PersonaChip preference={personaPreference} active={isPersonaFilterActive} onToggle={togglePersonaFilter} />
      )}

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-3 scrollbar-hide md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0">
        {STORY_TOPICS.map(({ id, icon: Icon, category: topicCategory }) => {
          const active = activeStory === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectStory(id, topicCategory)}
              className="flex w-[64px] shrink-0 flex-col items-center gap-1.5 text-center md:w-full"
            >
              <span
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full border',
                  active
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-muted text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="line-clamp-1 text-[11px] font-medium text-muted-foreground">
                {t(`homeFeed.stories.${id}`)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-hide md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        {FEED_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setActiveStory(null)
              setCategory(cat)
            }}
            className={cn(
              'whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              category === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {t(getCategoryLabelKey(cat))}
          </button>
        ))}
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 scrollbar-hide scroll-fade-x md:mx-0 md:mask-none md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {isLoading ? (
          <LoadingSkeleton variant="card" count={4} itemClassName="w-64 shrink-0 md:w-full md:shrink" />
        ) : filtered.length > 0 ? (
          filtered.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              saved={savedIds.has(place.id)}
              onToggleSave={toggleSave}
              className="w-64 shrink-0 md:w-full md:shrink"
            />
          ))
        ) : (
          <div className="w-full rounded-2xl border border-border bg-card p-5 text-center md:col-span-4">
            <p className="text-sm font-semibold text-foreground">{t('homeFeed.empty')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('homeFeed.emptyHint')}</p>
          </div>
        )}
      </div>
    </section>
  )
}
