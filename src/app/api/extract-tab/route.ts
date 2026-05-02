import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { spawn } from 'child_process'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import os from 'os'

export const maxDuration = 180

function runExtractor(audioPath: string, bpm: number): Promise<object[]> {
  return new Promise((resolve, reject) => {
    const script = path.join(process.cwd(), 'scripts', 'extract_tab.py')
    const proc = spawn('python3', [script, audioPath, '--bpm', String(bpm)])

    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`extractor exited ${code}: ${stderr.slice(-600)}`))
        return
      }
      try {
        resolve(JSON.parse(stdout))
      } catch {
        reject(new Error(`bad JSON from extractor: ${stdout.slice(0, 200)}`))
      }
    })
  })
}

// POST /api/extract-tab
//
// Accepts multipart/form-data with:
//   songId  — uuid of the song
//   audio   — audio file (MP3, WAV, M4A, …)
//   save    — "true" to write tab_data back to the DB
//
// Runs the librosa onset/pitch extractor on the uploaded audio and
// returns { noteCount, tabData }. Writes to DB when save=true.
export async function POST(req: NextRequest) {
  const form = await req.formData()
  const songId = form.get('songId') as string | null
  const audioFile = form.get('audio') as File | null
  const save = form.get('save') === 'true'

  if (!songId) return NextResponse.json({ error: 'songId required' }, { status: 400 })
  if (!audioFile) return NextResponse.json({ error: 'audio file required' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { data: song } = await supabase
    .from('songs')
    .select('id, title, bpm')
    .eq('id', songId)
    .single()

  if (!song) return NextResponse.json({ error: 'song not found' }, { status: 404 })

  // Write the uploaded file to a temp path so the Python script can read it
  const ext = audioFile.name.split('.').pop() ?? 'mp3'
  const tmpPath = path.join(os.tmpdir(), `extract-${songId}-${Date.now()}.${ext}`)
  const bytes = await audioFile.arrayBuffer()
  await writeFile(tmpPath, Buffer.from(bytes))

  let tabData: object[]
  try {
    tabData = await runExtractor(tmpPath, song.bpm ?? 80)
  } catch (e) {
    await unlink(tmpPath).catch(() => {})
    return NextResponse.json({ error: `extraction failed: ${e}` }, { status: 500 })
  }

  await unlink(tmpPath).catch(() => {})

  if (save) {
    const { error } = await supabase
      .from('songs')
      .update({ tab_data: tabData })
      .eq('id', songId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok:        true,
    saved:     save,
    noteCount: tabData.length,
    tabData,
  })
}
