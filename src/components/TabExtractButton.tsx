'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  songId: string
}

type Phase = 'idle' | 'extracting' | 'preview' | 'saving' | 'done' | 'error'

interface TabNote {
  time: number
  string: number
  fret: number
  note: string
  duration: number
}

export default function TabExtractButton({ songId }: Props) {
  const [phase, setPhase]     = useState<Phase>('idle')
  const [file, setFile]       = useState<File | null>(null)
  const [preview, setPreview] = useState<TabNote[] | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    setFile(f)
    setPhase('idle')
    setPreview(null)
    setError(null)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function handleExtract() {
    if (!file) return
    setPhase('extracting')
    setError(null)

    const form = new FormData()
    form.append('songId', songId)
    form.append('audio', file)
    form.append('save', 'false')

    try {
      const res = await fetch('/api/extract-tab', { method: 'POST', body: form })
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
    if (!file) return
    setPhase('saving')

    const form = new FormData()
    form.append('songId', songId)
    form.append('audio', file)
    form.append('save', 'true')

    try {
      const res = await fetch('/api/extract-tab', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'save failed')
      setPhase('done')
    } catch (e) {
      setError(String(e))
      setPhase('error')
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-zinc-300">Extract tab from audio</p>
        <p className="text-xs text-zinc-600 mt-0.5">
          Upload the downloaded YouTube video or any audio file (MP4, WebM, MP3, WAV…). Onset + pitch detection derives note timings automatically.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer
          ${dragging ? 'border-amber-500 bg-amber-500/5' : 'border-zinc-800 hover:border-zinc-600'}
          ${phase === 'extracting' || phase === 'saving' ? 'pointer-events-none opacity-50' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*,.mp3,.wav,.m4a,.flac,.ogg,.mp4,.webm,.mkv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <div className="p-4 text-center">
          {file ? (
            <p className="text-sm text-zinc-300 font-medium">{file.name}</p>
          ) : (
            <p className="text-sm text-zinc-600">Drop video or audio file here, or click to browse</p>
          )}
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 flex-wrap">
        {phase === 'idle' || phase === 'error' ? (
          <Button variant="outline" size="sm" onClick={handleExtract} disabled={!file}>
            Extract
          </Button>
        ) : phase === 'extracting' ? (
          <span className="text-xs text-zinc-500 animate-pulse">Extracting…</span>
        ) : phase === 'preview' && preview ? (
          <>
            <span className="text-xs text-zinc-500">{preview.length} notes detected</span>
            <Button variant="outline" size="sm" onClick={() => setPhase('idle')}>Discard</Button>
            <Button size="sm" onClick={handleSave}>Save to DB</Button>
          </>
        ) : phase === 'saving' ? (
          <span className="text-xs text-zinc-500 animate-pulse">Saving…</span>
        ) : phase === 'done' ? (
          <span className="text-xs text-emerald-500">Saved to database</span>
        ) : null}
      </div>

      {error && (
        <p className="text-xs text-red-400 font-mono break-all">{error}</p>
      )}

      {/* Preview table */}
      {phase === 'preview' && preview && preview.length > 0 && (
        <div className="overflow-x-auto">
          <table className="text-xs font-mono text-zinc-500 w-full">
            <thead>
              <tr className="text-zinc-700">
                {['#', 'time', 'str', 'fret', 'note', 'dur'].map(h => (
                  <th key={h} className="text-left pr-4 pb-1">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 24).map((n, i) => (
                <tr key={i} className="hover:text-zinc-300">
                  <td className="pr-4">{i + 1}</td>
                  <td className="pr-4">{n.time.toFixed(3)}</td>
                  <td className="pr-4">{n.string}</td>
                  <td className="pr-4">{n.fret}</td>
                  <td className="pr-4">{n.note}</td>
                  <td>{n.duration.toFixed(3)}</td>
                </tr>
              ))}
              {preview.length > 24 && (
                <tr><td colSpan={6} className="pt-1 text-zinc-700">… and {preview.length - 24} more</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
