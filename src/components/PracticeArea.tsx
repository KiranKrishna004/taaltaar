'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Song, TabNote } from '@/types'
import { frequencyToNote, notesMatch, noteToFrequency } from '@/lib/pitchDetection'
import { recordPractice } from '@/lib/gamification'
import ScoreCard from './ScoreCard'
import { Button } from '@/components/ui/button'

const AlphaTabRenderer = dynamic(() => import('./AlphaTabRenderer'), { ssr: false })

interface Props { song: Song }

type PracticeState = 'idle' | 'permission_denied' | 'playing' | 'finished'

// Per-string character (index 0 = string 1 high e, index 5 = string 6 low E).
// noiseLp:   1-pole LP alpha applied to the initial noise excitation.
//            Higher (→1) = brighter pluck (thin steel); lower = warmer (thick wound).
// decay:     KS loop gain. Closer to 0.5 = slower decay. Wound strings sustain longer.
// shelfGain: dB cut on a high shelf above 3.5 kHz. Thin strings keep more treble.
const STRING_CFG = [
  { noiseLp: 0.95, decay: 0.4982, shelfGain: -5  }, // 1: high e  — thin, bright, fast decay
  { noiseLp: 0.88, decay: 0.4984, shelfGain: -7  }, // 2: B
  { noiseLp: 0.80, decay: 0.4985, shelfGain: -8  }, // 3: G
  { noiseLp: 0.72, decay: 0.4987, shelfGain: -9  }, // 4: D  — wound
  { noiseLp: 0.64, decay: 0.4989, shelfGain: -10 }, // 5: A  — wound, fuller
  { noiseLp: 0.56, decay: 0.4991, shelfGain: -12 }, // 6: low E — thick, warm, slow decay
]

// Karplus-Strong with per-string excitation shaping.
// Ring buffer size = Math.round(sr/freq) keeps pitch accurate — using floor+1 would shift
// every note flat by up to half a semitone.
function ksBuffer(ctx: AudioContext, freq: number, duration: number, stringNum: number): AudioBuffer {
  const cfg  = STRING_CFG[(stringNum - 1) % 6]
  const sr   = ctx.sampleRate
  const N    = Math.max(2, Math.round(sr / freq))
  const len  = Math.ceil((duration + 2.5) * sr)
  const buf  = ctx.createBuffer(1, len, sr)
  const data = buf.getChannelData(0)

  // LP-filter the seed noise so each string has its own tonal character at the attack
  const ring = new Float32Array(N)
  let lp = 0
  for (let i = 0; i < N; i++) {
    const n = Math.random() * 2 - 1
    lp      = cfg.noiseLp * n + (1 - cfg.noiseLp) * lp
    ring[i] = lp
  }

  for (let i = 0; i < len; i++) {
    const cur  = i       % N
    const next = (i + 1) % N
    data[i]    = ring[cur]
    ring[cur]  = (ring[cur] + ring[next]) * cfg.decay
  }

  return buf
}

export default function PracticeArea({ song }: Props) {
  const [state, setState] = useState<PracticeState>('idle')
  const [currentTime, setCurrentTime] = useState(0)
  const [notesHit, setNotesHit] = useState(0)
  const [noteResults, setNoteResults] = useState<Map<number, 'hit' | 'miss'>>(new Map())
  const [showScoreCard, setShowScoreCard] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [melodyVolume, setMelodyVolume] = useState(0.5)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startAtRef = useRef<number>(0)
  const notesHitRef = useRef(0)
  const noteResultsRef = useRef<Map<number, 'hit' | 'miss'>>(new Map())
  const scheduledOscsRef = useRef<AudioBufferSourceNode[]>([])

  const tabData = song.tab_data as TabNote[]
  const totalNotes = tabData.length
  const songDuration = tabData.length > 0
    ? tabData[tabData.length - 1].time + tabData[tabData.length - 1].duration + 1
    : 30

  // Keep master gain in sync with the volume slider even while playing
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.setTargetAtTime(melodyVolume, audioContextRef.current!.currentTime, 0.02)
    }
  }, [melodyVolume])

  const cleanup = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    scheduledOscsRef.current.forEach(o => { try { o.stop() } catch { /* already stopped */ } })
    scheduledOscsRef.current = []
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null }
    masterGainRef.current = null
  }, [])

  useEffect(() => { return cleanup }, [cleanup])

  const finishPractice = useCallback(() => {
    cleanup()
    const score = totalNotes > 0 ? Math.round((notesHitRef.current / totalNotes) * 100) : 0
    setFinalScore(score)
    recordPractice(song.id, score, notesHitRef.current, song.language)
    setState('finished')
    setShowScoreCard(true)
  }, [cleanup, totalNotes, song.id, song.language])

  const startPractice = async () => {
    try {
      // Echo cancellation prevents the synthesized melody from confusing pitch detection
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream

      const ctx = new AudioContext()
      audioContextRef.current = ctx

      // Mic input → analyser (not connected to destination — silent monitoring)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyserRef.current = analyser
      ctx.createMediaStreamSource(stream).connect(analyser)

      // Master gain for melody volume
      const masterGain = ctx.createGain()
      masterGain.gain.value = melodyVolume
      masterGain.connect(ctx.destination)
      masterGainRef.current = masterGain

      const PitchFinderModule = await import('pitchfinder')
      const PitchFinder = PitchFinderModule.default || PitchFinderModule
      const detectPitch = (PitchFinder as {
        YIN: (opts: { sampleRate: number }) => (buf: Float32Array) => number | null
      }).YIN({ sampleRate: ctx.sampleRate })

      // Pre-generate all KS buffers first (CPU-heavy) so the time we sample
      // for startAt reflects what's left after the work is done.
      const prebuilt: Array<{ note: TabNote; buf: AudioBuffer }> = []
      for (const note of tabData) {
        const freq = noteToFrequency(note.note)
        if (freq) prebuilt.push({ note, buf: ksBuffer(ctx, freq, note.duration, note.string) })
      }

      // Sample startAt only after all buffer generation is complete.
      const startAt = ctx.currentTime + 0.05
      startAtRef.current = startAt

      // Schedule all sources with per-string shelf EQ — no buffer work left, just API calls.
      scheduledOscsRef.current = prebuilt.map(({ note, buf }) => {
        const cfg = STRING_CFG[(note.string - 1) % 6]

        const source = ctx.createBufferSource()
        source.buffer = buf

        const shelf = ctx.createBiquadFilter()
        shelf.type = 'highshelf'
        shelf.frequency.value = 3500
        shelf.gain.value = cfg.shelfGain

        source.connect(shelf)
        shelf.connect(masterGain)
        source.start(startAt + note.time)
        source.stop(startAt + note.time + note.duration + 2.5)
        return source
      })

      setState('playing')
      setCurrentTime(0)
      setNotesHit(0)
      notesHitRef.current = 0
      const freshMap = new Map<number, 'hit' | 'miss'>()
      setNoteResults(freshMap)
      noteResultsRef.current = freshMap

      intervalRef.current = setInterval(() => {
        if (!audioContextRef.current) return
        const elapsed = audioContextRef.current.currentTime - startAtRef.current
        setCurrentTime(elapsed)

        if (elapsed > songDuration) {
          finishPractice()
          return
        }

        const buf = new Float32Array(analyser.fftSize)
        analyser.getFloatTimeDomainData(buf)
        const pitch = detectPitch(buf)

        if (pitch && pitch > 50 && pitch < 2000) {
          const detectedNote = frequencyToNote(pitch)
          const expectedNote = tabData.find(n => Math.abs(n.time - elapsed) < 0.2 + n.duration / 2)

          if (expectedNote) {
            const noteIndex = tabData.indexOf(expectedNote)
            if (!noteResultsRef.current.has(noteIndex)) {
              const hit = notesMatch(detectedNote, expectedNote.note)
              const newMap = new Map(noteResultsRef.current)
              newMap.set(noteIndex, hit ? 'hit' : 'miss')
              noteResultsRef.current = newMap
              setNoteResults(newMap)
              if (hit) { notesHitRef.current += 1; setNotesHit(notesHitRef.current) }
            }
          }
        }
      }, 50)
    } catch {
      setState('permission_denied')
    }
  }

  const liveScore = totalNotes > 0 ? Math.round((notesHit / totalNotes) * 100) : 0
  const progress = Math.min((currentTime / songDuration) * 100, 100)

  return (
    <div className="rounded-2xl border border-zinc-800/80 overflow-hidden bg-[#0a0a0c]">

      {/* Tab viewer */}
      <div className="p-5">
        <AlphaTabRenderer
          tabData={tabData}
          currentTime={currentTime}
          isPlaying={state === 'playing'}
          noteResults={noteResults}
          bpm={song.bpm}
          duration={songDuration}
          audioCtx={state === 'playing' ? audioContextRef.current : null}
          startAt={startAtRef.current}
        />
      </div>

      {/* Progress bar */}
      {state === 'playing' && (
        <div className="px-5 pb-4">
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Controls bar */}
      <div className="px-5 py-4 border-t border-zinc-800/60">

        {state === 'idle' && (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5 text-sm text-zinc-500">
              <span className="text-lg">🎸</span>
              <span>Pick up your guitar and play the melody</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>Melody</span>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={melodyVolume}
                  onChange={e => setMelodyVolume(parseFloat(e.target.value))}
                  className="w-20 accent-amber-500"
                />
              </div>
              <Button onClick={startPractice} size="lg">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Play Along
              </Button>
            </div>
          </div>
        )}

        {state === 'permission_denied' && (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-2xl">🎤</span>
              <div>
                <p className="text-zinc-300 font-medium">Microphone access needed</p>
                <p className="text-zinc-600 text-xs mt-0.5">Enable mic permission to track your playing</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setState('idle')}>
              Try Again
            </Button>
          </div>
        )}

        {state === 'playing' && (
          <div className="flex items-center gap-4 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { cleanup(); setState('idle') }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12"/>
              </svg>
              Stop
            </Button>

            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>Melody</span>
              <input
                type="range" min={0} max={1} step={0.05}
                value={melodyVolume}
                onChange={e => setMelodyVolume(parseFloat(e.target.value))}
                className="w-20 accent-amber-500"
              />
            </div>

            <div className="ml-auto flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-extrabold text-amber-400 leading-none tabular-nums">
                  {liveScore}<span className="text-sm font-normal text-zinc-500">%</span>
                </div>
                <div className="text-xs text-zinc-600 mt-0.5">{notesHit}/{totalNotes} notes</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                <div
                  className="w-6 h-6 rounded-full border-2 border-amber-500"
                  style={{
                    boxShadow: '0 0 8px rgba(245,158,11,0.5)',
                    background: 'radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {state === 'finished' && !showScoreCard && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span>🎉</span>
              <span>Practice complete!</span>
            </div>
            <Button onClick={() => setState('idle')}>
              Play Again
            </Button>
          </div>
        )}
      </div>

      {showScoreCard && (
        <ScoreCard
          score={finalScore}
          notesHit={notesHit}
          totalNotes={totalNotes}
          onClose={() => { setShowScoreCard(false); setState('idle') }}
        />
      )}
    </div>
  )
}
