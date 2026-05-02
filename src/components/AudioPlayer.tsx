'use client'

import { useState, useRef, useEffect } from 'react'

interface Props { src: string }

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function AudioPlayer({ src }: Props) {
  const audioRef                    = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying]       = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration]     = useState(0)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime  = () => setCurrentTime(el.currentTime)
    const onMeta  = () => setDuration(el.duration)
    const onEnd   = () => { setPlaying(false); setCurrentTime(0) }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('ended', onEnd)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('ended', onEnd)
    }
  }, [])

  function toggle() {
    const el = audioRef.current
    if (!el) return
    if (playing) { el.pause(); setPlaying(false) }
    else         { el.play();  setPlaying(true)  }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const el = audioRef.current
    if (!el || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    el.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play / pause */}
      <button
        onClick={toggle}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
      >
        {playing ? (
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
          </svg>
        ) : (
          <svg className="w-3 h-3 translate-x-px" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>

      {/* Progress bar */}
      <div
        className="flex-1 h-1.5 bg-zinc-800 rounded-full cursor-pointer group"
        onClick={seek}
      >
        <div
          className="h-full bg-amber-500 rounded-full relative transition-none"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Time */}
      <span className="shrink-0 text-xs tabular-nums text-zinc-500">
        {fmt(currentTime)}{duration ? ` / ${fmt(duration)}` : ''}
      </span>
    </div>
  )
}
