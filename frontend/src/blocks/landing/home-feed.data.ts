import { Music2, Utensils, Camera, Trees, ShoppingBag, type LucideIcon } from 'lucide-react'
import type { PlaceCategory } from '@/types/place'

export type StoryTopic = 'kpop' | 'streetFood' | 'photoSpots' | 'nature' | 'shopping'

export const STORY_TOPICS: Array<{ id: StoryTopic; icon: LucideIcon; category: PlaceCategory }> = [
  { id: 'kpop', icon: Music2, category: 'fun' },
  { id: 'streetFood', icon: Utensils, category: 'food' },
  { id: 'photoSpots', icon: Camera, category: 'photo' },
  { id: 'nature', icon: Trees, category: 'culture' },
  { id: 'shopping', icon: ShoppingBag, category: 'fun' },
]

export const FEED_CATEGORIES: PlaceCategory[] = ['all', 'culture', 'food', 'fun', 'photo']
