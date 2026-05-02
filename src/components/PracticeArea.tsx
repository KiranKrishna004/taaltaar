'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Song, TabNote } from '@/types'
import { frequencyToNote, notesMatch } from '@/lib/pitchDetection'
import { recordPractice } from '@/lib/gamification'
import ScoreCard from './ScoreCard'
import { Button } from '@/components/ui/button'

const AlphaTabRenderer = dynamic(() => import('./AlphaTabRenderer'), { ssr: false })

interface Props { song: Song }

type PracticeState = 'idle' | 'permission_denied' | 'playing' | 'finished'

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
  const instrumentRef    = useRef<{ play: (note: string | number, when: number, opts?: object) => AudioBufferSourceNode; stop: () => void } | null>(null)
  const scheduleTickRef  = useRef<(() => void) | null>(null)

  const tabData = (song.tab_data ?? []) as TabNote[]
  const offset = song.youtube_offset ?? 0
  const totalNotes = tabData.length
  const songDuration = tabData.length > 0
    ? offset + tabData[tabData.length - 1].time + tabData[tabData.length - 1].duration + 1
    : 30

  // Keep master gain in sync with the volume slider even while playing
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.setTargetAtTime(melodyVolume, audioContextRef.current!.currentTime, 0.02)
    }
  }, [melodyVolume])

  const cleanup = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (instrumentRef.current) { try { instrumentRef.current.stop() } catch { /* already stopped */ }; instrumentRef.current = null }
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
      await ctx.resume()

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

      const [PitchFinderModule, { default: Soundfont }] = await Promise.all([
        import('pitchfinder'),
        import('soundfont-player'),
      ])
      const PitchFinder = PitchFinderModule.default || PitchFinderModule
      const detectPitch = (PitchFinder as {
        YIN: (opts: { sampleRate: number }) => (buf: Float32Array) => number | null
      }).YIN({ sampleRate: ctx.sampleRate })

      // Load samples (network fetch) before sampling startAt so scheduling is tight.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instrument = await (Soundfont as any).instrument(ctx, 'acoustic_guitar_steel', {
        destination: masterGain,
      })
      instrumentRef.current = instrument

      const startAt = ctx.currentTime + 0.1
      startAtRef.current = startAt

      // Rolling scheduler — only create nodes 3 s ahead to avoid stalling the audio thread.
      const LOOKAHEAD = 3.0
      const sorted = [...tabData].sort((a, b) => a.time - b.time)
      let nextIdx = 0

      const scheduleTick = () => {
        const ctx2 = audioContextRef.current
        if (!ctx2) return
        const elapsed = ctx2.currentTime - startAtRef.current
        const horizon = elapsed + LOOKAHEAD
        while (nextIdx < sorted.length && sorted[nextIdx].time <= horizon) {
          const note = sorted[nextIdx++]
          const pitch = note.midi ?? note.note
          instrument.play(pitch, startAt + offset + note.time, { duration: note.duration + 1 })
        }
      }

      scheduleTickRef.current = scheduleTick
      scheduleTick()

      setState('playing')
      setCurrentTime(0)
      setNotesHit(0)
      notesHitRef.current = 0
      const freshMap = new Map<number, 'hit' | 'miss'>()
      setNoteResults(freshMap)
      noteResultsRef.current = freshMap

      intervalRef.current = setInterval(() => {
        if (!audioContextRef.current) return
        scheduleTickRef.current?.()
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
          const expectedNote = tabData.find(n => Math.abs((n.time + offset) - elapsed) < 0.2 + n.duration / 2)

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
