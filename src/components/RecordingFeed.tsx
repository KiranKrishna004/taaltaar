'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getDeviceFingerprint } from '@/lib/fingerprint'
import { Recording } from '@/types'
import { cn } from '@/lib/utils'
import { stars, scoreColor } from '@/lib/scoreUtils'

interface Props { songId: string }

export default function RecordingFeed({ songId }: Props) {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set())
  const [fingerprint, setFingerprint] = useState('')

  const fetchRecordings = useCallback(async () => {
    const { data } = await supabase
      .from('recordings')
      .select('*')
      .eq('song_id', songId)
      .eq('hidden', false)
      .order('score', { ascending: false })
      .limit(20)
    if (data) setRecordings(data)
  }, [songId])

  useEffect(() => {
    const fp = getDeviceFingerprint()
    setFingerprint(fp)
    fetchRecordings()
    supabase
      .from('upvotes')
      .select('recording_id')
      .eq('device_fingerprint', fp)
      .then(({ data }) => {
        if (data) setUpvotedIds(new Set(data.map((u: { recording_id: string }) => u.recording_id)))
      })
  }, [songId, fetchRecordings])

  async function handleUpvote(recordingId: string) {
    if (upvotedIds.has(recordingId)) return
    const { error } = await supabase
      .from('upvotes')
      .insert({ recording_id: recordingId, device_fingerprint: fingerprint })
    if (!error) {
      const rec = recordings.find(r => r.id === recordingId)
      if (rec) await supabase.from('recordings').update({ upvotes: rec.upvotes + 1 }).eq('id', recordingId)
      setUpvotedIds(prev => new Set(prev).add(recordingId))
      fetchRecordings()
    }
  }

  if (recordings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <span className="text-3xl">🎵</span>
        <p className="text-zinc-500 text-sm">No recordings yet</p>
        <p className="text-zinc-600 text-xs">Be the first to share your score!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {recordings.map((rec, i) => (
        <div
          key={rec.id}
          className="flex items-center gap-4 bg-zinc-800/30 hover:bg-zinc-800/60 border border-zinc-800/60 rounded-xl px-4 py-3.5 transition-colors"
        >
          <div className="text-zinc-600 text-xs font-mono w-5 text-center shrink-0">{i + 1}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn('font-bold text-sm', scoreColor(rec.score))}>{rec.score}%</span>
              <span className="text-xs leading-none">{stars(rec.score)}</span>
            </div>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', rec.score >= 75 ? 'bg-amber-500' : 'bg-zinc-600')}
                style={{ width: `${rec.score}%` }}
              />
            </div>
          </div>

          <div className="text-zinc-600 text-xs shrink-0">
            {new Date(rec.created_at).toLocaleDateString()}
          </div>

          <button
            onClick={() => handleUpvote(rec.id)}
            className={cn(
              'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              upvotedIds.has(rec.id)
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:border-zinc-600 hover:text-zinc-300'
            )}
          >
            <span>▲</span>
            <span>{rec.upvotes}</span>
          </button>
        </div>
      ))}
    </div>
  )
}
