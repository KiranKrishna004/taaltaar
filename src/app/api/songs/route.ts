import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET /api/songs?q=name — fuzzy search existing songs by title
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ songs: [] })

  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('songs')
    .select('id, title')
    .ilike('title', `%${q}%`)
    .limit(3)

  return NextResponse.json({ songs: data ?? [] })
}

// PATCH /api/songs  { songId, youtube_offset }
export async function PATCH(req: NextRequest) {
  const { songId, youtube_offset } = await req.json()
  if (!songId) return NextResponse.json({ error: 'songId required' }, { status: 400 })
  if (typeof youtube_offset !== 'number') return NextResponse.json({ error: 'youtube_offset must be a number' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('songs')
    .update({ youtube_offset })
    .eq('id', songId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
