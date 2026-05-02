import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'
import { spawn } from 'child_process'
import { writeFile, readFile, unlink } from 'fs/promises'
import path from 'path'
import os from 'os'

export const maxDuration = 180

function runExtractor(audioPath: string, mode: string, vocalOutputPath?: string): Promise<object[]> {
  return new Promise((resolve, reject) => {
    const script = path.join(process.cwd(), 'scripts', 'extract_tab.py')
    const args   = [script, audioPath, '--mode', mode]
    if (vocalOutputPath) args.push('--vocal-output', vocalOutputPath)
    const proc = spawn('python3', args)
    let stdout = '', stderr = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', code => {
      if (code !== 0) { reject(new Error(`extractor failed: ${stderr.slice(-400)}`)); return }
      try { resolve(JSON.parse(stdout)) } catch { reject(new Error(`bad JSON: ${stdout.slice(0, 200)}`)) }
    })
  })
}

// POST /api/submissions/[id]/extract  body: { mode: 'vocal' | 'guitar' }
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

  const tmpBase  = path.join(os.tmpdir(), `extract-${Date.now()}`)
  const tmpVocal = `${tmpBase}-vocal.wav`

  let tabData: object[]
  let vocalUrl: string | null = submission.vocal_url ?? null

  if (mode === 'vocal' && submission.vocal_url) {
    // Re-use the stored vocal stem — run pYIN directly on it (no Demucs)
    const vocalKey = new URL(submission.vocal_url).pathname.split('/vocals/')[1]
    const { data: vocalData, error: vocalErr } = await supabase.storage
      .from('vocals')
      .download(vocalKey)

    if (vocalErr || !vocalData) {
      return NextResponse.json({ error: `vocal download failed: ${vocalErr?.message}` }, { status: 500 })
    }

    const tmpVocalIn = `${tmpBase}-vocal-in.wav`
    await writeFile(tmpVocalIn, Buffer.from(await vocalData.arrayBuffer()))

    try {
      tabData = await runExtractor(tmpVocalIn, 'vocal-stem')
    } catch (e) {
      await unlink(tmpVocalIn).catch(() => {})
      return NextResponse.json({ error: `extraction failed: ${e}` }, { status: 500 })
    }

    await unlink(tmpVocalIn).catch(() => {})
  } else {
    // First extraction or guitar mode — download raw audio and run full pipeline
    const storageKey = new URL(submission.audio_url).pathname.split('/submissions/')[1]
    const { data: audioData, error: downloadErr } = await supabase.storage
      .from('submissions')
      .download(storageKey)

    if (downloadErr || !audioData) {
      return NextResponse.json({ error: `audio download failed: ${downloadErr?.message}` }, { status: 500 })
    }

    // Preserve original extension so librosa picks the right demuxer
    const ext      = storageKey.split('.').pop() ?? 'mp3'
    const tmpAudio = `${tmpBase}.${ext}`
    await writeFile(tmpAudio, Buffer.from(await audioData.arrayBuffer()))

    try {
      tabData = await runExtractor(tmpAudio, mode, mode === 'vocal' ? tmpVocal : undefined)
    } catch (e) {
      await unlink(tmpAudio).catch(() => {})
      await unlink(tmpVocal).catch(() => {})
      return NextResponse.json({ error: `extraction failed: ${e}` }, { status: 500 })
    }

    await unlink(tmpAudio).catch(() => {})

    // Upload vocal stem produced by first-time vocal extraction
    if (mode === 'vocal') {
      try {
        const vocalBuf = await readFile(tmpVocal)
        const vocalKey = `${id}.wav`
        const { error: uploadErr } = await supabase.storage
          .from('vocals')
          .upload(vocalKey, vocalBuf, { contentType: 'audio/wav', upsert: true })
        if (uploadErr) {
          console.error('vocal upload error:', uploadErr.message)
        } else {
          vocalUrl = supabase.storage.from('vocals').getPublicUrl(vocalKey).data.publicUrl
        }
      } catch (e) {
        console.error('vocal stem read/upload failed:', e)
      }
      await unlink(tmpVocal).catch(() => {})
    }
  }

  const { error: updateErr } = await supabase
    .from('audio_submissions')
    .update({ tab_data: tabData, note_count: tabData.length, extraction_mode: mode, vocal_url: vocalUrl })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, noteCount: tabData.length, tabData, vocalUrl })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
