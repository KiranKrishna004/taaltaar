'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  songId: string
  initialOffset: number
}

export default function OffsetInput({ songId, initialOffset }: Props) {
  const [offset, setOffset] = useState(initialOffset)
  const [state, setState]   = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError]   = useState<string | null>(null)

  async function save() {
    setState('saving'); setError(null)
    try {
      const res  = await fetch('/api/songs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, youtube_offset: offset }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'failed')
      setState('saved')
    } catch (e) { setError(String(e)); setState('error') }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-zinc-300">Song start offset</p>
        <p className="text-xs text-zinc-600 mt-0.5">
          Seconds before the first note plays. Open the YouTube video, find when the melody starts, enter that timestamp.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={0}
          step={0.5}
          value={offset}
          onChange={e => { setOffset(parseFloat(e.target.value) || 0); setState('idle') }}
          className="w-24 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <span className="text-xs text-zinc-600">seconds</span>
        <Button variant="outline" size="sm" onClick={save} disabled={state === 'saving'}>
          {state === 'saving' ? 'Saving…' : 'Save'}
        </Button>
        {state === 'saved' && <span className="text-xs text-emerald-500">Saved</span>}
      </div>
      {error && <p className="text-xs text-red-400 font-mono break-all">{error}</p>}
    </div>
  )
}
