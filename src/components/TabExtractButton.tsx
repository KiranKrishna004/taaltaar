'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  songId: string
  onExtracted?: (noteCount: number) => void
}

type Phase = 'idle' | 'extracting' | 'preview' | 'saving' | 'done' | 'error'

interface TabNote {
  time: number
  string: number
  fret: number
  note: string
  duration: number
}

export default function TabExtractButton({ songId, onExtracted }: Props) {
  const [phase, setPhase]       = useState<Phase>('idle')
  const [preview, setPreview]   = useState<TabNote[] | null>(null)
  const [error, setError]       = useState<string | null>(null)

  async function handleExtract() {
    setPhase('extracting')
    setError(null)
    setPreview(null)

    try {
      const res = await fetch('/api/extract-tab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, save: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'extraction failed')
      setPreview(data.tabData)
      setPhase('preview')
    } catch (e) {
      setError(String(e))
      setPhase('error')
    }
  }

  async function handleSave() {
    if (!preview) return
    setPhase('saving')

    try {
      const res = await fetch('/api/extract-tab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, save: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'save failed')
      setPhase('done')
      onExtracted?.(data.noteCount)
    } catch (e) {
      setError(String(e))
      setPhase('error')
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-zinc-300">Extract tab from audio</p>
          <p className="text-xs text-zinc-600 mt-0.5">
            Uses onset + pitch detection on the filtered YouTube audio to generate timing-accurate tab data.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {phase === 'idle' || phase === 'error' ? (
            <Button variant="outline" size="sm" onClick={handleExtract}>
              Extract
            </Button>
          ) : phase === 'extracting' ? (
            <span className="text-xs text-zinc-500 animate-pulse">Extracting…</span>
          ) : phase === 'preview' && preview ? (
            <>
              <span className="text-xs text-zinc-500">{preview.length} notes detected</span>
              <Button variant="outline" size="sm" onClick={() => setPhase('idle')}>
                Discard
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save to DB
              </Button>
            </>
          ) : phase === 'saving' ? (
            <span className="text-xs text-zinc-500 animate-pulse">Saving…</span>
          ) : phase === 'done' ? (
            <span className="text-xs text-emerald-500">Saved!</span>
          ) : null}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 font-mono break-all">{error}</p>
      )}

      {phase === 'preview' && preview && preview.length > 0 && (
        <div className="overflow-x-auto">
          <table className="text-xs font-mono text-zinc-500 w-full">
            <thead>
              <tr className="text-zinc-700">
                <th className="text-left pr-4 pb-1">#</th>
                <th className="text-left pr-4 pb-1">time</th>
                <th className="text-left pr-4 pb-1">str</th>
                <th className="text-left pr-4 pb-1">fret</th>
                <th className="text-left pr-4 pb-1">note</th>
                <th className="text-left pb-1">dur</th>
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 20).map((n, i) => (
                <tr key={i} className="hover:text-zinc-300">
                  <td className="pr-4">{i + 1}</td>
                  <td className="pr-4">{n.time.toFixed(3)}</td>
                  <td className="pr-4">{n.string}</td>
                  <td className="pr-4">{n.fret}</td>
                  <td className="pr-4">{n.note}</td>
                  <td>{n.duration.toFixed(3)}</td>
                </tr>
              ))}
              {preview.length > 20 && (
                <tr>
                  <td colSpan={6} className="pt-1 text-zinc-700">
                    … and {preview.length - 20} more
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
