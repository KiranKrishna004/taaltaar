import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { detectYouTubeOffset } from '@/lib/detectOffset'
import { Song, TabNote } from '@/types'

export const maxDuration = 300 // 5 min limit for streaming + analysis

function extractVideoId(url: string): string | null {
  return url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1] ?? null
}

async function processOne(song: Song): Promise<{ id: string; offset: number | null; error?: string }> {
  if (!song.youtube_url) return { id: song.id, offset: null, error: 'no youtube_url' }
  if (!extractVideoId(song.youtube_url)) return { id: song.id, offset: null, error: 'invalid url' }

  const tabData = song.tab_data as TabNote[]
  const firstNote = tabData[0]?.note
  if (!firstNote) return { id: song.id, offset: null, error: 'no tab data' }

  try {
    const offset = await detectYouTubeOffset(song.youtube_url, firstNote)
    return { id: song.id, offset }
  } catch (e) {
    return { id: song.id, offset: null, error: String(e) }
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const supabase = createServerSupabaseClient()

  let songs: Song[]

  if (body.all) {
    const { data, error } = await supabase.from('songs').select('*').not('youtube_url', 'is', null)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    songs = (data as Song[]) || []
  } else if (body.songId) {
    const { data, error } = await supabase.from('songs').select('*').eq('id', body.songId).single()
    if (error || !data) return NextResponse.json({ error: 'song not found' }, { status: 404 })
    songs = [data as Song]
  } else {
    return NextResponse.json({ error: 'provide songId or all:true' }, { status: 400 })
  }

  const results = []
  for (const song of songs) {
    const result = await processOne(song)
    if (result.offset !== null) {
      await supabase
        .from('songs')
        .update({ youtube_offset: result.offset })
        .eq('id', result.id)
    }
    results.push(result)
  }

  return NextResponse.json({ results })
}
