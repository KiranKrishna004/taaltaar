import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'

export const maxDuration = 15

// POST /api/submissions/[id]/extract  body: { mode: 'vocal' | 'guitar' }
// Marks the submission as processing, then fires a Modal background job.
// Returns 202 immediately — frontend polls for completion.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id }   = await params
    const { mode } = await req.json()

    if (mode !== 'vocal' && mode !== 'guitar') {
      return NextResponse.json({ error: 'mode must be vocal or guitar' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    const { data: submission, error: fetchErr } = await supabase
      .from('audio_submissions')
      .select('audio_url, vocal_url')
      .eq('id', id)
      .single()

    if (fetchErr || !submission?.audio_url) {
      return NextResponse.json({ error: 'submission not found or missing audio' }, { status: 404 })
    }

    // Mark processing immediately so the UI can start polling
    await supabase
      .from('audio_submissions')
      .update({ extraction_status: 'processing', extraction_error: null, extraction_started_at: new Date().toISOString() })
      .eq('id', id)

    // Trigger the Modal background job
    const webhookUrl = process.env.MODAL_WEBHOOK_URL
    const secret     = process.env.MODAL_WEBHOOK_SECRET

    if (!webhookUrl || !secret) {
      return NextResponse.json({ error: 'MODAL_WEBHOOK_URL / MODAL_WEBHOOK_SECRET not configured' }, { status: 500 })
    }

    const triggerRes = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        submission_id: id,
        audio_url:     submission.audio_url,
        vocal_url:     submission.vocal_url ?? null,
        mode,
      }),
    })

    if (!triggerRes.ok) {
      const text = await triggerRes.text()
      await supabase
        .from('audio_submissions')
        .update({ extraction_status: 'error', extraction_error: `Modal trigger failed: ${text.slice(0, 200)}` })
        .eq('id', id)
      return NextResponse.json({ error: `Modal trigger failed: ${text.slice(0, 200)}` }, { status: 502 })
    }

    return NextResponse.json({ ok: true, status: 'processing' })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
