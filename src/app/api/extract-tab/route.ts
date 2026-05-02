import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ensureAudioCached } from '@/lib/buildGuitarAudio'
import { spawn } from 'child_process'
import path from 'path'

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
// Body: { songId: string, save?: boolean }
//
// Fetches + caches the guitar audio if needed, then runs the Python
// onset/pitch extractor. Returns a preview of tab_data; writes to DB
// only when save=true.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { songId, save = false } = body as { songId?: string; save?: boolean }

  if (!songId) return NextResponse.json({ error: 'songId required' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { data: song } = await supabase
    .from('songs')
    .select('id, title, bpm, youtube_url')
    .eq('id', songId)
    .single()

  if (!song) return NextResponse.json({ error: 'song not found' }, { status: 404 })
  if (!song.youtube_url) return NextResponse.json({ error: 'song has no youtube_url' }, { status: 400 })

  let cachePath: string
  try {
    cachePath = await ensureAudioCached(songId, song.youtube_url)
  } catch (e) {
    return NextResponse.json({ error: `audio download failed: ${e}` }, { status: 500 })
  }

  let tabData: object[]
  try {
    tabData = await runExtractor(cachePath, song.bpm ?? 80)
  } catch (e) {
    return NextResponse.json({ error: `extraction failed: ${e}` }, { status: 500 })
  }

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
