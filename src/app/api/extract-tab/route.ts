import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { existsSync } from 'fs'
import { spawn } from 'child_process'
import path from 'path'
import os from 'os'

export const maxDuration = 180

function runExtractor(audioPath: string, bpm: number): Promise<object[]> {
  return new Promise((resolve, reject) => {
    const script = path.join(process.cwd(), 'scripts', 'extract_tab.py')
    const args = [script, audioPath, '--bpm', String(bpm)]
    const proc = spawn('python3', args)

    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`extractor exited ${code}: ${stderr.slice(-400)}`))
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
// Requires the guitar audio to already be cached at /tmp/guitar-{songId}.mp3.
// Call /api/guitar-audio?songId=... first if it isn't.
//
// Returns: { noteCount, tabData } — and writes to DB if save=true.
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

  const cachePath = path.join(os.tmpdir(), `guitar-${songId}.mp3`)

  // Auto-fetch audio if not cached yet
  if (!existsSync(cachePath)) {
    if (!song.youtube_url) {
      return NextResponse.json({ error: 'no youtube_url and audio not cached' }, { status: 400 })
    }

    // Reuse the guitar-audio route logic inline so we don't need an HTTP round-trip
    try {
      const audioRes = await fetch(
        `${req.nextUrl.origin}/api/guitar-audio?songId=${songId}`,
        { method: 'GET' },
      )
      if (!audioRes.ok) {
        return NextResponse.json(
          { error: `failed to fetch guitar audio: ${audioRes.statusText}` },
          { status: 500 },
        )
      }
      // Just drain the response so the file gets written to disk by the other route
      await audioRes.arrayBuffer()
    } catch (e) {
      return NextResponse.json({ error: `audio fetch error: ${e}` }, { status: 500 })
    }
  }

  if (!existsSync(cachePath)) {
    return NextResponse.json(
      { error: 'audio still not cached after fetch attempt — check /api/guitar-audio' },
      { status: 500 },
    )
  }

  let tabData: object[]
  try {
    tabData = await runExtractor(cachePath, song.bpm ?? 80)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
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
