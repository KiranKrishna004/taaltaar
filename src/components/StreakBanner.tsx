'use client'
import { useEffect, useState } from 'react'
import { getStreak } from '@/lib/gamification'

export default function StreakBanner() {
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    setStreak(getStreak())
  }, [])

  if (streak === 0) return null

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/20 rounded-xl px-5 py-3.5 flex items-center gap-3">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
      <div className="text-2xl">🔥</div>
      <div>
        <div className="text-white font-semibold text-sm">{streak} day streak!</div>
        <div className="text-amber-400/70 text-xs mt-0.5">Keep practicing daily to maintain your streak</div>
      </div>
      <div className="ml-auto text-right hidden sm:block">
        <div className="text-2xl font-bold text-amber-400">{streak}</div>
        <div className="text-xs text-amber-400/60">days</div>
      </div>
    </div>
  )
}
