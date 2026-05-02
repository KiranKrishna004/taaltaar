import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// POST /api/submissions  body: { songName, language, audioUrl, submittedBy }
// Audio is uploaded directly from the browser to Supabase Storage.
// This route only creates the DB record.
export async function POST(req: NextRequest) {
  const { songName, language, audioUrl, submittedBy } = await req.json()

  if (!songName?.trim()) return NextResponse.json({ error: 'songName required' },  { status: 400 })
  if (!language?.trim()) return NextResponse.json({ error: 'language required' },  { status: 400 })
  if (!audioUrl?.trim()) return NextResponse.json({ error: 'audioUrl required' },  { status: 400 })

  const supabase = createServerSupabaseClient()

  const { data: submission, error } = await supabase
    .from('audio_submissions')
    .insert({ song_name: songName.trim(), submitted_by: submittedBy, audio_url: audioUrl, language, note_count: 0, tab_data: [] })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, submissionId: submission.id })
}

// GET /api/submissions?status=pending|approved  — admin: list submissions by status
export async function GET(req: NextRequest) {
  const status  = req.nextUrl.searchParams.get('status') ?? 'pending'
  const allowed = ['pending', 'approved']
  if (!allowed.includes(status)) return NextResponse.json({ error: 'invalid status' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('audio_submissions')
    .select('id, song_name, note_count, status, submitted_by, created_at, tab_data, audio_url, vocal_url, extraction_mode, extraction_status, extraction_error')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ submissions: data })
}
