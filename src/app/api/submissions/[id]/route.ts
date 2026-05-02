import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'
import { lookupSong } from '@/lib/spotify'

// GET /api/submissions/[id]  — poll extraction status
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('audio_submissions')
    .select('id, tab_data, note_count, vocal_url, extraction_mode, extraction_status, extraction_error')
    .eq('id', id)
    .single()
  if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ submission: data })
}

// POST /api/submissions/[id]  body: { action: 'approve' | 'reject' }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id }     = await params
  const { action } = await req.json()

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()

  const { data: submission, error: fetchErr } = await supabase
    .from('audio_submissions')
    .select('song_name, tab_data, status, language')
    .eq('id', id)
    .single()

  if (fetchErr || !submission) return NextResponse.json({ error: 'submission not found' }, { status: 404 })

  const { data: song } = await supabase
    .from('songs')
    .select('id')
    .ilike('title', submission.song_name ?? '')
    .single()

  if (action === 'approve') {
    if (song) {
      const { error: updateErr } = await supabase
        .from('songs')
        .update({ tab_data: submission.tab_data })
        .eq('id', song.id)
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
    } else {
      // Auto-label the new song via Spotify
      const meta = submission.song_name ? await lookupSong(submission.song_name) : null
      const tabNotes = (submission.tab_data ?? []) as { time: number; duration: number }[]
      const noteDensity = tabNotes.length > 0
        ? tabNotes.length / (tabNotes[tabNotes.length - 1].time + tabNotes[tabNotes.length - 1].duration)
        : 0
      const difficulty = noteDensity > 2.5 ? 'advanced' : noteDensity > 1 ? 'intermediate' : 'beginner'

      const { error: insertErr } = await supabase
        .from('songs')
        .insert({
          title:      submission.song_name,
          tab_data:   submission.tab_data,
          composer:   meta?.composer ?? null,
          film:       meta?.film     ?? null,
          bpm:        meta?.bpm      ?? null,
          language:   submission.language ?? null,
          difficulty,
        })
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }
  }

  if (action === 'reject' && song) {
    const { error: clearErr } = await supabase
      .from('songs')
      .update({ tab_data: null })
      .eq('id', song.id)
    if (clearErr) return NextResponse.json({ error: clearErr.message }, { status: 500 })
  }

  // Disapproving an approved submission sends it back to pending for re-review
  const newStatus = action === 'approve'
    ? 'approved'
    : submission.status === 'approved' ? 'pending' : 'rejected'

  const { error: statusErr } = await supabase
    .from('audio_submissions')
    .update({ status: newStatus })
    .eq('id', id)

  if (statusErr) return NextResponse.json({ error: statusErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
