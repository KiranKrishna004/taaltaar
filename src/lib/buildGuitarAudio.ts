import { existsSync } from 'fs'
import { spawn } from 'child_process'
import path from 'path'
import os from 'os'

export function extractVideoId(url: string): string | null {
  return url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1] ?? null
}

export function audioCachePath(songId: string): string {
  return path.join(os.tmpdir(), `guitar-${songId}.mp3`)
}

// Downloads YouTube audio, converts to mono MP3, and applies a guitar-focused
// EQ chain using yt-dlp (robust against YouTube format changes) + ffmpeg-static.
//
// EQ chain:
//   highpass 80 Hz   — strip bass/kick
//   lowpass  5 kHz   — strip cymbals/air
//   +4 dB @ 1.5 kHz  — boost guitar presence/attack
//   -3 dB @ 250 Hz   — cut muddiness
export async function buildGuitarAudio(youtubeUrl: string, outPath: string): Promise<void> {
  // ffmpeg-static binary dir — yt-dlp --ffmpeg-location accepts a directory
  const ffmpegDir = path.join(process.cwd(), 'node_modules', 'ffmpeg-static')

  // yt-dlp outputs to a path with %(ext)s substituted; we want the final .mp3
  const outputTemplate = outPath.replace(/\.mp3$/, '.%(ext)s')

  const eqChain = [
    'highpass=f=80',
    'lowpass=f=5000',
    'equalizer=f=1500:width_type=o:width=2:g=4',
    'equalizer=f=250:width_type=o:width=2:g=-3',
  ].join(',')

  const args = [
    '-m', 'yt_dlp',
    '--extract-audio',
    '--audio-format', 'mp3',
    '--audio-quality', '96K',
    '--ffmpeg-location', ffmpegDir,
    '--postprocessor-args', `ffmpeg:-af ${eqChain} -ar 44100 -ac 1`,
    '--no-playlist',
    '--no-progress',
    '-o', outputTemplate,
    youtubeUrl,
  ]

  return new Promise((resolve, reject) => {
    const proc = spawn('python3', args)
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp failed (${code}): ${stderr.slice(-600)}`))
      } else {
        resolve()
      }
    })
  })
}

// Ensures audio is cached, building it from YouTube if needed.
export async function ensureAudioCached(songId: string, youtubeUrl: string): Promise<string> {
  const cachePath = audioCachePath(songId)
  if (existsSync(cachePath)) return cachePath

  if (!extractVideoId(youtubeUrl)) throw new Error(`invalid YouTube URL: ${youtubeUrl}`)

  await buildGuitarAudio(youtubeUrl, cachePath)
  return cachePath
}
