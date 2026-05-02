import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { spawn } from 'child_process'
import { writeFile, readFile, unlink } from 'fs/promises'
import path from 'path'
import os from 'os'

export const maxDuration = 30

const VIDEO_EXTS = new Set(['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv'])

function extractAudio(inputPath: string, outputPath: string): Promise<void> {
  const ffmpeg = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg')
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, ['-y', '-i', inputPath, '-vn', '-ar', '44100', '-ac', '1', '-b:a', '128k', outputPath])
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg failed: ${stderr.slice(-300)}`)))
  })
}

// POST /api/submissions  (multipart: songName, audio, submittedBy?)
// Uploads the raw audio to Storage and creates a pending submission — no extraction yet.
export async function POST(req: NextRequest) {
  const form        = await req.formData()
  const songName    = form.get('songName')    as string | null
  const audioFile   = form.get('audio')       as File   | null
  const submittedBy = form.get('submittedBy') as string | null
  const language    = form.get('language')    as string | null

  if (!songName?.trim()) return NextResponse.json({ error: 'songName required' },   { status: 400 })
  if (!audioFile)        return NextResponse.json({ error: 'audio file required' }, { status: 400 })
  if (!language?.trim()) return NextResponse.json({ error: 'language required' },   { status: 400 })

  const supabase  = createServerSupabaseClient()
  const ext       = (audioFile.name.split('.').pop() ?? 'mp3').toLowerCase()
  const tmpBase   = path.join(os.tmpdir(), `submission-${Date.now()}`)
  const tmpRaw    = `${tmpBase}.${ext}`
  const tmpMp3    = `${tmpBase}.mp3`
  const isVideo   = VIDEO_EXTS.has(ext)
  const audioPath = isVideo ? tmpMp3 : tmpRaw

  await writeFile(tmpRaw, Buffer.from(await audioFile.arrayBuffer()))

  const cleanup = () => Promise.all([
    unlink(tmpRaw).catch(() => {}),
    isVideo ? unlink(tmpMp3).catch(() => {}) : Promise.resolve(),
  ])

  if (isVideo) {
    try { await extractAudio(tmpRaw, tmpMp3) }
    catch (e) { await cleanup(); return NextResponse.json({ error: `audio extraction failed: ${e}` }, { status: 500 }) }
  }

  // Upload audio to Storage
  const storageKey = `${Date.now()}.mp3`
  const audioBuf = await readFile(isVideo ? tmpMp3 : tmpRaw)

  const { error: uploadErr } = await supabase.storage
    .from('submissions')
    .upload(storageKey, audioBuf, { contentType: 'audio/mpeg', upsert: false })

  await cleanup()

  if (uploadErr) return NextResponse.json({ error: `storage upload failed: ${uploadErr.message}` }, { status: 500 })

  const { data: { publicUrl: audioUrl } } = supabase.storage.from('submissions').getPublicUrl(storageKey)

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
    .select('id, song_name, note_count, status, submitted_by, created_at, tab_data, audio_url, vocal_url, extraction_mode')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ submissions: data })
}
