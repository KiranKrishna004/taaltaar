'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getBestScore } from '@/lib/gamification'
import { Recording } from '@/types'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { stars } from '@/lib/scoreUtils'

interface Props { songId: string }

const rankMedal = ['🥇', '🥈', '🥉']
const rankStyle = ['text-yellow-400', 'text-zinc-300', 'text-amber-700']

export default function Leaderboard({ songId }: Props) {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [myBest, setMyBest] = useState<number | null>(null)

  useEffect(() => {
    setMyBest(getBestScore(songId))
    supabase
      .from('recordings')
      .select('*')
      .eq('song_id', songId)
      .eq('hidden', false)
      .order('score', { ascending: false })
      .limit(10)
      .then(({ data }) => { if (data) setRecordings(data) })
  }, [songId])

  return (
    <div className="space-y-4">
      {myBest !== null && (
        <>
          <div className="flex items-center justify-between bg-amber-500/8 border border-amber-500/15 rounded-xl px-4 py-3.5">
            <div className="flex items-center gap-2 text-sm text-amber-300">
              <span>🎯</span>
              <span className="font-medium">Your best</span>
            </div>
            <div className="text-amber-400 font-bold">
              {myBest}% <span className="font-normal text-sm">{stars(myBest)}</span>
            </div>
          </div>
          <Separator />
        </>
      )}

      {recordings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <span className="text-2xl">🏆</span>
          <p className="text-zinc-500 text-sm text-center">No scores yet — be the first!</p>
        </div>
      ) : (
        <div className="space-y-1">
          {recordings.map((rec, i) => (
            <div
              key={rec.id}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl transition-colors',
                i < 3 ? 'bg-zinc-800/50' : 'hover:bg-zinc-900/60'
              )}
            >
              <span className={cn('w-6 text-center text-sm shrink-0 font-semibold', rankStyle[i] ?? 'text-zinc-600')}>
                {i < 3 ? rankMedal[i] : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">{rec.score}%</span>
                  <span className="text-xs leading-none">{stars(rec.score)}</span>
                </div>
                <div className="text-zinc-600 text-xs mt-0.5">
                  {new Date(rec.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-1 text-zinc-500 text-xs shrink-0">
                <span>▲</span><span>{rec.upvotes}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
