import { existsSync } from 'fs'
import path from 'path'
import os from 'os'

export function extractVideoId(url: string): string | null {
  return url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1] ?? null
}

export function audioCachePath(songId: string): string {
  return path.join(os.tmpdir(), `guitar-${songId}.mp3`)
}

export async function buildGuitarAudio(youtubeUrl: string, outPath: string): Promise<void> {
  const [ytdlModule, ffmpegModule] = await Promise.all([
    import('@distube/ytdl-core'),
    import('fluent-ffmpeg'),
  ])

  const ytdl = ytdlModule.default
  const ffmpeg = ffmpegModule.default

  // dynamic import('ffmpeg-static') returns '/ROOT/...' in Next.js ESM context.
  // require() resolves the path correctly from the package's own __dirname.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegPath: string = require('ffmpeg-static')

  const audioStream = ytdl(youtubeUrl, {
    filter: 'audioonly',
    quality: 'lowestaudio',
  })

  return new Promise((resolve, reject) => {
    ffmpeg(audioStream)
      .setFfmpegPath(ffmpegPath)
      .audioChannels(1)
      .audioFrequency(44100)
      .audioFilter([
        'highpass=f=80',
        'lowpass=f=5000',
        'equalizer=f=1500:width_type=o:width=2:g=4',
        'equalizer=f=250:width_type=o:width=2:g=-3',
      ])
      .format('mp3')
      .audioBitrate(96)
      .on('error', reject)
      .on('end', () => resolve())
      .save(outPath)
  })
}

// Ensures audio is cached, building it from YouTube if needed.
// Throws with a descriptive message on failure.
export async function ensureAudioCached(songId: string, youtubeUrl: string): Promise<string> {
  const cachePath = audioCachePath(songId)
  if (existsSync(cachePath)) return cachePath

  if (!extractVideoId(youtubeUrl)) throw new Error(`invalid YouTube URL: ${youtubeUrl}`)

  await buildGuitarAudio(youtubeUrl, cachePath)
  return cachePath
}
