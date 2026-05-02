'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { TabNote } from '@/types'

const AlphaTabRenderer = dynamic(() => import('./AlphaTabRenderer'), { ssr: false })

interface Props { tabData: TabNote[]; bpm?: number }

export default function SubmissionPreview({ tabData, bpm = 80 }: Props) {
  const [playing, setPlaying]   = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const audioCtxRef   = useRef<AudioContext | null>(null)
  const startAtRef    = useRef(0)
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instrumentRef = useRef<any>(null)

  const duration = tabData.length > 0
    ? tabData[tabData.length - 1].time + tabData[tabData.length - 1].duration + 1
    : 30

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (instrumentRef.current) { try { instrumentRef.current.stop() } catch { /* already stopped */ }; instrumentRef.current = null }
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null }
    setPlaying(false); setCurrentTime(0)
  }, [])

  useEffect(() => () => stop(), [stop])

  async function play() {
    try {
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      await ctx.resume()

      const { default: Soundfont } = await import('soundfont-player')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instrument = await (Soundfont as any).instrument(ctx, 'acoustic_guitar_steel')
      instrumentRef.current = instrument

      const startAt = ctx.currentTime + 0.1
      startAtRef.current = startAt

      // Rolling scheduler — only create AudioBufferSourceNodes 3 s ahead.
      // Scheduling all notes at once (e.g. 2000+) stalls the audio thread.
      const LOOKAHEAD = 3.0
      const sorted = [...tabData].sort((a, b) => a.time - b.time)
      let nextIdx = 0

      const tick = () => {
        const ctx2 = audioCtxRef.current
        if (!ctx2) return
        const elapsed = ctx2.currentTime - startAtRef.current
        const horizon = elapsed + LOOKAHEAD

        while (nextIdx < sorted.length && sorted[nextIdx].time <= horizon) {
          const note = sorted[nextIdx++]
          const pitch = note.midi ?? note.note
          instrument.play(pitch, startAt + note.time, { duration: note.duration + 1 })
        }

        setCurrentTime(elapsed)
        if (elapsed > duration) stop()
      }

      setPlaying(true)
      setCurrentTime(0)
      tick()
      intervalRef.current = setInterval(tick, 200)
    } catch (err) {
      console.error('SubmissionPreview play error:', err)
    }
  }

  const progress = Math.min((currentTime / duration) * 100, 100)

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="p-4">
        <AlphaTabRenderer
          tabData={tabData}
          currentTime={currentTime}
          isPlaying={playing}
          bpm={bpm}
          duration={duration}
          audioCtx={playing ? audioCtxRef.current : null}
          startAt={startAtRef.current}
        />
      </div>

      {playing && (
        <div className="px-4 pb-3">
          <div className="h-0.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-none" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-t border-zinc-800 flex items-center gap-3">
        {playing ? (
          <button
            onClick={stop}
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>
            Stop
          </button>
        ) : (
          <button
            onClick={play}
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            Preview melody
          </button>
        )}
        <span className="text-xs text-zinc-600">{tabData.length} notes</span>
      </div>
    </div>
  )
}
