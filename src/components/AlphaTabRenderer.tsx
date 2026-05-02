'use client'

import { useEffect, useRef } from 'react'
import { TabNote } from '@/types'

interface Props {
  tabData: TabNote[]
  currentTime?: number
  isPlaying?: boolean
  noteResults?: Map<number, 'hit' | 'miss'>
  bpm?: number
  duration?: number
  // When playing, pass the live AudioContext so the RAF loop reads the audio clock
  // directly instead of relying on React state updates for timing.
  audioCtx?: AudioContext | null
  startAt?: number
}

const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E']
const STRING_COLORS = ['#a78bfa', '#818cf8', '#60a5fa', '#34d399', '#fbbf24', '#f87171']

export default function AlphaTabRenderer({
  tabData,
  currentTime = 0,
  isPlaying = false,
  noteResults = new Map(),
  bpm = 120,
  duration = 60,
  audioCtx = null,
  startAt = 0,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)

  // Mutable refs updated every render — the RAF loop reads these without needing to restart.
  const currentTimeRef  = useRef(currentTime)
  const noteResultsRef  = useRef(noteResults)
  const audioCtxRef     = useRef(audioCtx)
  const startAtRef      = useRef(startAt)
  const tabDataRef      = useRef(tabData)
  const bpmRef          = useRef(bpm)
  const durationRef     = useRef(duration)

  currentTimeRef.current  = currentTime
  noteResultsRef.current  = noteResults
  audioCtxRef.current     = audioCtx
  startAtRef.current      = startAt
  tabDataRef.current      = tabData
  bpmRef.current          = bpm
  durationRef.current     = duration

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = () => {
      const ctx2d = canvas.getContext('2d')
      if (!ctx2d) return

      // Read live audio clock when playing; fall back to prop value when paused/idle.
      const t = (isPlaying && audioCtxRef.current)
        ? audioCtxRef.current.currentTime - startAtRef.current
        : currentTimeRef.current

      const W = canvas.width
      const H = canvas.height
      const STRINGS = 6
      const MARGIN_LEFT = 48
      const MARGIN_RIGHT = 24
      const PLAYHEAD_X = MARGIN_LEFT + 60
      const TIME_SCALE = 90
      const STRING_SPACING = (H - 32) / (STRINGS + 1)
      const NOTE_R = 13
      const tab = tabDataRef.current
      const results = noteResultsRef.current
      const measureInterval = (60 / bpmRef.current) * 4
      const dur = durationRef.current

      ctx2d.clearRect(0, 0, W, H)

      // Background
      ctx2d.fillStyle = '#0c0c0e'
      ctx2d.fillRect(0, 0, W, H)

      const scanGrad = ctx2d.createLinearGradient(0, 0, 0, H)
      scanGrad.addColorStop(0, 'rgba(255,255,255,0.01)')
      scanGrad.addColorStop(1, 'rgba(0,0,0,0.05)')
      ctx2d.fillStyle = scanGrad
      ctx2d.fillRect(0, 0, W, H)

      // ── String lines ──
      for (let s = 1; s <= STRINGS; s++) {
        const y = 16 + s * STRING_SPACING
        const weight = s === 1 ? 0.8 : s === 6 ? 2 : s * 0.25 + 0.5
        ctx2d.beginPath()
        ctx2d.moveTo(MARGIN_LEFT, y)
        ctx2d.lineTo(W - MARGIN_RIGHT, y)
        ctx2d.strokeStyle = `rgba(${s < 4 ? '161,161,170' : '113,113,122'},${0.25 + (s / 6) * 0.2})`
        ctx2d.lineWidth = weight
        ctx2d.stroke()
      }

      // ── Measure markers ──
      for (let mt = 0; mt < dur; mt += measureInterval) {
        const x = PLAYHEAD_X + (mt - t) * TIME_SCALE
        if (x < MARGIN_LEFT || x > W - MARGIN_RIGHT) continue
        ctx2d.beginPath()
        ctx2d.moveTo(x, 16)
        ctx2d.lineTo(x, H - 8)
        ctx2d.strokeStyle = 'rgba(255,255,255,0.04)'
        ctx2d.lineWidth = 1
        ctx2d.setLineDash([3, 5])
        ctx2d.stroke()
        ctx2d.setLineDash([])
      }

      // ── Playhead glow ──
      const pgGrad = ctx2d.createLinearGradient(PLAYHEAD_X - 30, 0, PLAYHEAD_X + 30, 0)
      pgGrad.addColorStop(0, 'rgba(245,158,11,0)')
      pgGrad.addColorStop(0.5, 'rgba(245,158,11,0.06)')
      pgGrad.addColorStop(1, 'rgba(245,158,11,0)')
      ctx2d.fillStyle = pgGrad
      ctx2d.fillRect(PLAYHEAD_X - 30, 0, 60, H)

      ctx2d.beginPath()
      ctx2d.moveTo(PLAYHEAD_X, 8)
      ctx2d.lineTo(PLAYHEAD_X, H - 8)
      ctx2d.strokeStyle = '#f59e0b'
      ctx2d.lineWidth = 1.5
      ctx2d.shadowColor = '#f59e0b'
      ctx2d.shadowBlur = 8
      ctx2d.stroke()
      ctx2d.shadowBlur = 0

      ctx2d.beginPath()
      ctx2d.moveTo(PLAYHEAD_X - 6, 8)
      ctx2d.lineTo(PLAYHEAD_X + 6, 8)
      ctx2d.lineTo(PLAYHEAD_X, 16)
      ctx2d.closePath()
      ctx2d.fillStyle = '#f59e0b'
      ctx2d.fill()

      // ── Notes ──
      tab.forEach((note, idx) => {
        const x = PLAYHEAD_X + (note.time - t) * TIME_SCALE
        const y = 16 + note.string * STRING_SPACING

        if (x < MARGIN_LEFT - NOTE_R || x > W + NOTE_R) return

        // Active: note has reached (or is within 50ms of) the playhead and hasn't finished yet.
        // Using a directional check rather than Math.abs prevents early glow while notes are approaching.
        const isActive = t >= note.time - 0.05 && t < note.time + note.duration + 0.1
        const isPast   = t >= note.time + note.duration + 0.1
        const result   = results.get(idx)

        if (!isPast && note.duration > 0.3) {
          const barW = note.duration * TIME_SCALE - NOTE_R
          ctx2d.beginPath()
          ctx2d.roundRect(x, y - 2.5, barW, 5, 2)
          ctx2d.fillStyle = isActive ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.05)'
          ctx2d.fill()
        }

        if (isActive) {
          ctx2d.shadowColor = result === 'hit' ? '#10b981' : result === 'miss' ? '#ef4444' : '#f59e0b'
          ctx2d.shadowBlur = 20
        }

        ctx2d.beginPath()
        ctx2d.arc(x, y, NOTE_R, 0, Math.PI * 2)
        ctx2d.fillStyle = result === 'hit' ? '#10b981'
          : result === 'miss'  ? '#ef4444'
          : isActive           ? '#f59e0b'
          : isPast             ? '#1c1c1f'
          :                      '#18181b'
        ctx2d.fill()
        ctx2d.shadowBlur = 0

        ctx2d.beginPath()
        ctx2d.arc(x, y, NOTE_R, 0, Math.PI * 2)
        ctx2d.strokeStyle = result === 'hit' ? '#34d399'
          : result === 'miss'  ? '#f87171'
          : isActive           ? '#fbbf24'
          : isPast             ? '#27272a'
          :                      STRING_COLORS[note.string - 1]
        ctx2d.lineWidth = isPast ? 1 : 1.5
        ctx2d.globalAlpha = isPast ? 0.4 : 1
        ctx2d.stroke()
        ctx2d.globalAlpha = 1

        ctx2d.fillStyle = result ? '#fff' : isActive ? '#000' : isPast ? '#3f3f46' : '#e4e4e7'
        ctx2d.font = 'bold 10px monospace'
        ctx2d.textAlign = 'center'
        ctx2d.textBaseline = 'middle'
        ctx2d.globalAlpha = isPast ? 0.35 : 1
        ctx2d.fillText(note.fret.toString(), x, y)
        ctx2d.globalAlpha = 1
      })

      ctx2d.textAlign = 'left'
      ctx2d.textBaseline = 'alphabetic'
    }

    draw()

    if (isPlaying) {
      const loop = () => { draw(); animFrameRef.current = requestAnimationFrame(loop) }
      animFrameRef.current = requestAnimationFrame(loop)
    }

    return () => cancelAnimationFrame(animFrameRef.current)
  // Only restart the loop when these structural props change — NOT on currentTime/noteResults.
  // Those are read via refs inside draw() so changes are picked up on the next frame automatically.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, tabData, bpm, duration])

  const CANVAS_H = 220
  const STRING_SPACING = (CANVAS_H - 32) / 7

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden border border-zinc-800/80 bg-[#0c0c0e]">
        <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none">
          {STRING_LABELS.map((label, i) => {
            const pct = ((16 + (i + 1) * STRING_SPACING) / CANVAS_H) * 100
            return (
              <div
                key={label}
                className="absolute flex items-center justify-center w-12"
                style={{ top: `${pct}%`, transform: 'translateY(-50%)' }}
              >
                <span className="text-xs font-bold font-mono" style={{ color: STRING_COLORS[i] }}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
        <canvas ref={canvasRef} width={800} height={220} className="w-full block" />
      </div>

      <div className="flex flex-col gap-2.5 px-1 text-xs text-zinc-500">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-zinc-600 shrink-0">Strings:</span>
          <div className="flex items-center gap-2 flex-wrap">
            {STRING_LABELS.map((label, i) => (
              <div key={label} className="flex items-center gap-1">
                <span className="text-zinc-600">{i + 1}</span>
                <span className="font-bold font-mono" style={{ color: STRING_COLORS[i] }}>{label}</span>
              </div>
            ))}
            <span className="text-zinc-700 ml-1">— high (1) to low (6)</span>
          </div>
        </div>

        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full border border-zinc-500 bg-zinc-800 flex items-center justify-center font-bold font-mono text-zinc-300 text-[10px]">3</span>
            <span>= fret to press (melody note)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full border border-zinc-500 bg-zinc-800 flex items-center justify-center font-bold font-mono text-zinc-300 text-[10px]">0</span>
            <span>= open string</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded-full bg-amber-500" />
            <span>= playhead</span>
          </div>
        </div>
      </div>
    </div>
  )
}
