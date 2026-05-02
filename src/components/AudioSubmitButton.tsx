'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { getDeviceFingerprint } from '@/lib/fingerprint'
import { LANGUAGE_CONFIG } from '@/lib/languageConfig'

type Phase = 'idle' | 'processing' | 'done' | 'error'
interface ExistingSong { id: string; title: string }

export default function AudioSubmitButton() {
  const [open, setOpen]           = useState(false)
  const [phase, setPhase]         = useState<Phase>('idle')
  const [file, setFile]           = useState<File | null>(null)
  const [songName, setSongName]   = useState('')
  const [language, setLanguage]   = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [dragging, setDragging]   = useState(false)
  const [matches, setMatches]     = useState<ExistingSong[]>([])
  const inputRef   = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (songName.trim().length < 2) { setMatches([]); return }

    debounceRef.current = setTimeout(async () => {
      const res  = await fetch(`/api/songs?q=${encodeURIComponent(songName.trim())}`)
      const data = await res.json()
      setMatches(data.songs ?? [])
    }, 350)
  }, [songName])

  const canSubmit = file && songName.trim() && language && phase !== 'processing'

  function reset() { setPhase('idle'); setFile(null); setSongName(''); setLanguage(''); setError(null); setMatches([]) }

  async function submit() {
    if (!canSubmit) return
    setPhase('processing'); setError(null)

    const fp   = await getDeviceFingerprint()
    const form = new FormData()
    form.append('songName', songName.trim())
    form.append('language', language)
    form.append('audio', file)
    form.append('submittedBy', fp)

    try {
      const res  = await fetch('/api/submissions', { method: 'POST', body: form })
      const contentType = res.headers.get('content-type') ?? ''
      const data = contentType.includes('application/json') ? await res.json() : {}
      if (!res.ok) throw new Error(data.error ?? `Upload failed (${res.status})`)
      setPhase('done')
    } catch (e) { setError(String(e)); setPhase('error') }
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <button className="group flex items-center gap-2.5 rounded-full bg-amber-500 hover:bg-amber-400 pl-4 pr-5 py-3 text-sm font-medium text-black shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all hover:scale-105 active:scale-95">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Request a song
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {phase === 'done' ? (
          <div className="p-8 text-center space-y-3">
            <div className="text-4xl mb-2">🎸</div>
            <p className="text-base font-semibold text-emerald-400">Submitted for review</p>
            <p className="text-sm text-zinc-400">Your recording has been sent for review</p>
            <p className="text-xs text-zinc-600">We'll extract the melody and add it to the library shortly</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button onClick={reset} className="text-sm text-zinc-400 hover:text-zinc-200 underline underline-offset-2 transition-colors">
                Submit another
              </button>
              <button onClick={() => { setOpen(false); reset() }} className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm text-zinc-200 transition-colors">
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request a song</DialogTitle>
              <DialogDescription>
                Upload a guitar recording and we'll extract the melody and add it to the library.
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 pb-6 space-y-4">
              {/* Song name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Song name</label>
                <input
                  type="text"
                  placeholder="e.g. Venmathi Venmathiye"
                  value={songName}
                  onChange={e => setSongName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>

              {/* Language */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Language</label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                >
                  <option value="" disabled>Select language…</option>
                  {Object.entries(LANGUAGE_CONFIG).map(([key, lang]) => (
                    <option key={key} value={key}>{lang.label}</option>
                  ))}
                </select>
              </div>

              {/* Existing song matches */}
              {matches.length > 0 && (
                <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3 space-y-2">
                  <p className="text-xs font-medium text-amber-400">This song might already be in the library</p>
                  <div className="space-y-1">
                    {matches.map(s => (
                      <Link
                        key={s.id}
                        href={`/song/${s.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between rounded-md bg-zinc-900 px-3 py-2 hover:bg-zinc-800 transition-colors group"
                      >
                        <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{s.title}</span>
                        <span className="text-xs text-amber-500">View →</span>
                      </Link>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-600">If it's a different version or not quite right, you can still submit below.</p>
                </div>
              )}

              {/* Drop zone */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Your recording</label>
                <div
                  className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer
                    ${dragging ? 'border-amber-500 bg-amber-500/5' : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50'}
                    ${phase === 'processing' ? 'pointer-events-none opacity-40' : ''}`}
                  onClick={() => inputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
                >
                  <input
                    ref={inputRef} type="file"
                    accept="audio/*,video/*,.mp3,.wav,.m4a,.flac,.ogg,.mp4,.webm"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }}
                  />
                  <div className="py-6 px-4 text-center space-y-1.5">
                    {file ? (
                      <>
                        <p className="text-sm font-medium text-zinc-200">{file.name}</p>
                        <p className="text-xs text-zinc-600">Click to change</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-zinc-400">Drop your guitar recording here</p>
                        <p className="text-xs text-zinc-700">MP3 · WAV · M4A · MP4 · WebM</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Processing */}
              {phase === 'processing' && (
                <div className="flex items-center gap-3 rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-zinc-300">Extracting melody…</p>
                    <p className="text-xs text-zinc-600 mt-0.5">This takes 15–30 seconds</p>
                  </div>
                </div>
              )}

              {/* Error */}
              {phase === 'error' && error && (
                <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 space-y-1">
                  <p className="text-xs font-medium text-red-400">Something went wrong</p>
                  <p className="text-xs text-zinc-500 font-mono break-all">{error}</p>
                  <button onClick={() => { setPhase('idle'); setError(null) }} className="text-xs text-zinc-500 underline hover:text-zinc-300">
                    Try again
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={() => { setOpen(false); reset() }}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={!canSubmit}
                  className={`rounded-lg px-5 py-2 text-sm font-medium transition-all
                    ${canSubmit ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                >
                  Submit for review
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
