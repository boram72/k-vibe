// [미사용, 2026-09 서비스 컨셉 변경(PR #11)] home-feed.tsx 전용 데이터 — 그 파일과
// 같은 사유로 미사용(원복 방법은 home-feed.tsx 주석 참고).
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
