import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createReadStream, statSync } from 'fs'
import { extractVideoId, ensureAudioCached } from '@/lib/buildGuitarAudio'

export const maxDuration = 120

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

  let cachePath: string
  try {
    cachePath = await ensureAudioCached(songId, song.youtube_url)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
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
