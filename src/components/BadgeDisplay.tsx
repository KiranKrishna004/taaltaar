'use client'
import { useEffect, useState } from 'react'
import { computeBadges } from '@/lib/gamification'
import { Badge as AppBadge } from '@/types'
import { cn } from '@/lib/utils'

export default function BadgeDisplay() {
  const [badges, setBadges] = useState<AppBadge[]>([])

  useEffect(() => {
    setBadges(computeBadges())
  }, [])

  const earned = badges.filter(b => b.earned)
  if (badges.length === 0) return null

  return (
    <div className="space-y-3">
      {earned.length > 0 && (
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Your badges</p>
      )}
      <div className="flex flex-wrap gap-2">
        {badges.map(badge => (
          <div
            key={badge.id}
            title={badge.description}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              badge.earned
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/25 shadow-sm shadow-amber-500/5'
                : 'bg-zinc-900/50 text-zinc-700 border-zinc-800'
            )}
          >
            <span className={badge.earned ? '' : 'grayscale opacity-40'}>{badge.emoji}</span>
            <span>{badge.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
