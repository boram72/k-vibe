import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

interface LoadingSkeletonProps {
  variant?: 'card' | 'list'
  count?: number
  itemClassName?: string
}

export function LoadingSkeleton({ variant = 'card', count = 1, itemClassName }: LoadingSkeletonProps) {
  const items = Array.from({ length: count })

  if (variant === 'list') {
    return (
      <div className="flex flex-col gap-4">
        {items.map((_, i) => (
          <CardSkeleton key={i} className={itemClassName} />
        ))}
      </div>
    )
  }

  return (
    <>
      {items.map((_, i) => (
        <CardSkeleton key={i} className={itemClassName} />
      ))}
    </>
  )
}
