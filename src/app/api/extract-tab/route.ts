import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { spawn } from 'child_process'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import os from 'os'

export const maxDuration = 180

const VIDEO_EXTS = new Set(['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv'])

// If the uploaded file is a video container, extract audio to a temp MP3
// using ffmpeg-static so librosa gets a clean audio stream.
function extractAudio(inputPath: string, outputPath: string): Promise<void> {
  const ffmpeg = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg')
  const eqChain = [
    'highpass=f=80',
    'lowpass=f=5000',
    'equalizer=f=1500:width_type=o:width=2:g=4',
    'equalizer=f=250:width_type=o:width=2:g=-3',
  ].join(',')

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, [
      '-y', '-i', inputPath,
      '-vn',                        // drop video stream
      '-af', eqChain,
      '-ar', '44100',
      '-ac', '1',
      '-b:a', '96k',
      outputPath,
    ])
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', (code) => {
      code === 0 ? resolve() : reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-400)}`))
    })
  })
}

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
// Accepts multipart/form-data:
//   songId  — uuid
//   audio   — MP3/WAV/M4A/MP4/WebM/… (audio or video file)
//   save    — "true" to write tab_data back to the DB
export async function POST(req: NextRequest) {
  const form = await req.formData()
  const songId    = form.get('songId') as string | null
  const audioFile = form.get('audio')  as File   | null
  const save      = form.get('save') === 'true'

  if (!songId)    return NextResponse.json({ error: 'songId required' },     { status: 400 })
  if (!audioFile) return NextResponse.json({ error: 'audio file required' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { data: song } = await supabase
    .from('songs')
    .select('id, bpm')
    .eq('id', songId)
    .single()

  if (!song) return NextResponse.json({ error: 'song not found' }, { status: 404 })

  const ext     = (audioFile.name.split('.').pop() ?? 'mp3').toLowerCase()
  const tmpBase = path.join(os.tmpdir(), `extract-${songId}-${Date.now()}`)
  const tmpRaw  = `${tmpBase}.${ext}`
  const tmpMp3  = `${tmpBase}.mp3`

  // Write uploaded bytes to disk
  await writeFile(tmpRaw, Buffer.from(await audioFile.arrayBuffer()))

  // If it's a video container, extract + EQ the audio track first
  const isVideo = VIDEO_EXTS.has(ext)
  const audioPath = isVideo ? tmpMp3 : tmpRaw

  const cleanup = () =>
    Promise.all([unlink(tmpRaw), isVideo ? unlink(tmpMp3) : Promise.resolve()].map(p => p.catch(() => {})))

  if (isVideo) {
    try {
      await extractAudio(tmpRaw, tmpMp3)
    } catch (e) {
      await cleanup()
      return NextResponse.json({ error: `audio extraction failed: ${e}` }, { status: 500 })
    }
  }

  let tabData: object[]
  try {
    tabData = await runExtractor(audioPath, song.bpm ?? 80)
  } catch (e) {
    await cleanup()
    return NextResponse.json({ error: `tab extraction failed: ${e}` }, { status: 500 })
  }

  await cleanup()

  if (save) {
    const { error } = await supabase
      .from('songs')
      .update({ tab_data: tabData })
      .eq('id', songId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, saved: save, noteCount: tabData.length, tabData })
}
