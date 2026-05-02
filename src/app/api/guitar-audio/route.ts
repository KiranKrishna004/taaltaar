import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { existsSync, createReadStream, statSync } from 'fs'
import { writeFile } from 'fs/promises'
import path from 'path'
import os from 'os'

export const maxDuration = 120

function extractVideoId(url: string): string | null {
  return url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1] ?? null
}

async function buildGuitarAudio(youtubeUrl: string, outPath: string): Promise<void> {
  const [ytdlModule, ffmpegModule, ffmpegStaticModule] = await Promise.all([
    import('@distube/ytdl-core'),
    import('fluent-ffmpeg'),
    import('ffmpeg-static'),
  ])

  const ytdl = ytdlModule.default
  const ffmpeg = ffmpegModule.default
  const ffmpegPath = ffmpegStaticModule.default as string

  const audioStream = ytdl(youtubeUrl, {
    filter: 'audioonly',
    quality: 'lowestaudio',
  })

  return new Promise((resolve, reject) => {
    ffmpeg(audioStream)
      .setFfmpegPath(ffmpegPath)
      .audioChannels(1)
      .audioFrequency(44100)
      // Guitar-focused filter chain:
      //  1. highpass at 80 Hz  — removes bass/kick
      //  2. lowpass at 5000 Hz — removes cymbals/harsh air
      //  3. +4 dB boost at 1.5 kHz (guitar presence/attack)
      //  4. -3 dB cut at 250 Hz (reduces muddiness / boxiness)
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

export async function GET(req: NextRequest) {
  const songId = req.nextUrl.searchParams.get('songId')
  if (!songId) return NextResponse.json({ error: 'songId required' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { data: song } = await supabase
    .from('songs')
    .select('youtube_url')
    .eq('id', songId)
    .single()

  if (!song?.youtube_url) return NextResponse.json({ error: 'no youtube_url' }, { status: 404 })
  if (!extractVideoId(song.youtube_url)) return NextResponse.json({ error: 'invalid url' }, { status: 400 })

  const cachePath = path.join(os.tmpdir(), `guitar-${songId}.mp3`)

  if (!existsSync(cachePath)) {
    try {
      await buildGuitarAudio(song.youtube_url, cachePath)
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 })
    }
  }

  const stat = statSync(cachePath)
  const rangeHeader = req.headers.get('range')

  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace('bytes=', '').split('-')
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1
    const chunkSize = end - start + 1

    const stream = createReadStream(cachePath, { start, end })
    return new NextResponse(stream as unknown as ReadableStream, {
      status: 206,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
      },
    })
  }

  const stream = createReadStream(cachePath)
  return new NextResponse(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Content-Length': String(stat.size),
    },
  })
}
