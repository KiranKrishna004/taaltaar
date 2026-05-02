import { PassThrough } from 'stream'

const NOTE_FREQS: Record<string, number> = {
  'C0': 16.35, 'C#0': 17.32, 'D0': 18.35, 'D#0': 19.45, 'E0': 20.60,
  'F0': 21.83, 'F#0': 23.12, 'G0': 24.50, 'G#0': 25.96, 'A0': 27.50, 'A#0': 29.14, 'B0': 30.87,
  'C1': 32.70, 'C#1': 34.65, 'D1': 36.71, 'D#1': 38.89, 'E1': 41.20,
  'F1': 43.65, 'F#1': 46.25, 'G1': 49.00, 'G#1': 51.91, 'A1': 55.00, 'A#1': 58.27, 'B1': 61.74,
  'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41,
  'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81,
  'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
  'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25,
  'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
  'C6': 1046.50, 'C#6': 1108.73, 'D6': 1174.66, 'D#6': 1244.51, 'E6': 1318.51,
  'F6': 1396.91, 'F#6': 1479.98, 'G6': 1567.98, 'G#6': 1661.22, 'A6': 1760.00, 'A#6': 1864.66, 'B6': 1975.53,
}

export function noteToFrequency(note: string): number | null {
  return NOTE_FREQS[note] ?? null
}

// Guitar frequency range: ~82 Hz (low E) to ~1318 Hz (high E top fret)
// High-pass at 80 Hz removes bass/kick drum; low-pass at 1400 Hz removes vocals/cymbals.
// Both are first-order IIR filters applied in series.
function bandpassGuitarRange(input: Float32Array, sampleRate: number): Float32Array {
  const out = new Float32Array(input.length)

  // High-pass at 80 Hz: y[n] = alpha * (y[n-1] + x[n] - x[n-1])
  const hpRc = 1 / (2 * Math.PI * 80)
  const dt = 1 / sampleRate
  const hpAlpha = hpRc / (hpRc + dt)
  let hpPrev = 0
  let xPrev = 0
  for (let i = 0; i < input.length; i++) {
    hpPrev = hpAlpha * (hpPrev + input[i] - xPrev)
    xPrev = input[i]
    out[i] = hpPrev
  }

  // Low-pass at 1400 Hz: y[n] = lpAlpha * x[n] + (1-lpAlpha) * y[n-1]
  const lpRc = 1 / (2 * Math.PI * 1400)
  const lpAlpha = dt / (lpRc + dt)
  let lpPrev = 0
  for (let i = 0; i < out.length; i++) {
    lpPrev = lpAlpha * out[i] + (1 - lpAlpha) * lpPrev
    out[i] = lpPrev
  }

  return out
}

function rms(samples: Float32Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
  return Math.sqrt(sum / samples.length)
}

function yinPitch(samples: Float32Array, sampleRate: number): number | null {
  const bufLen = samples.length
  const halfLen = Math.floor(bufLen / 2)
  const threshold = 0.15
  const d = new Float32Array(halfLen)

  // Difference function
  for (let tau = 1; tau < halfLen; tau++) {
    for (let j = 0; j < halfLen; j++) {
      const diff = samples[j] - samples[j + tau]
      d[tau] += diff * diff
    }
  }

  // Cumulative mean normalized difference
  const cmnd = new Float32Array(halfLen)
  cmnd[0] = 1
  let runningSum = 0
  for (let tau = 1; tau < halfLen; tau++) {
    runningSum += d[tau]
    cmnd[tau] = d[tau] * tau / runningSum
  }

  // Find first dip below threshold
  let tau = 2
  while (tau < halfLen) {
    if (cmnd[tau] < threshold) {
      while (tau + 1 < halfLen && cmnd[tau + 1] < cmnd[tau]) tau++
      break
    }
    tau++
  }

  if (tau === halfLen || cmnd[tau] >= threshold) return null

  // Parabolic interpolation
  const prev = cmnd[tau - 1]
  const curr = cmnd[tau]
  const next = tau + 1 < halfLen ? cmnd[tau + 1] : curr
  const betterTau = tau + (next - prev) / (2 * (2 * curr - next - prev))

  return sampleRate / betterTau
}

async function streamYouTubeAudio(
  youtubeUrl: string,
  maxSeconds: number,
): Promise<Float32Array> {
  const [ytdlModule, ffmpegModule, ffmpegStaticModule] = await Promise.all([
    import('@distube/ytdl-core'),
    import('fluent-ffmpeg'),
    import('ffmpeg-static'),
  ])

  const ytdl = ytdlModule.default
  const ffmpeg = ffmpegModule.default
  const ffmpegPath = (ffmpegStaticModule.default as string)

  const SAMPLE_RATE = 22050
  const bytesPerSample = 2 // s16le
  const maxBytes = maxSeconds * SAMPLE_RATE * bytesPerSample

  return new Promise((resolve, reject) => {
    const audioStream = ytdl(youtubeUrl, {
      filter: 'audioonly',
      quality: 'lowestaudio',
    })

    const passThrough = new PassThrough()
    const chunks: Buffer[] = []
    let totalBytes = 0
    let resolved = false

    const finish = () => {
      if (resolved) return
      resolved = true
      const combined = Buffer.concat(chunks)
      const samples = new Float32Array(combined.length / 2)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = combined.readInt16LE(i * 2) / 32768
      }
      resolve(samples)
    }

    passThrough.on('data', (chunk: Buffer) => {
      if (resolved) return
      chunks.push(chunk)
      totalBytes += chunk.length
      if (totalBytes >= maxBytes) finish()
    })
    passThrough.on('end', finish)
    passThrough.on('error', reject)

    ffmpeg(audioStream)
      .setFfmpegPath(ffmpegPath)
      .format('s16le')
      .audioChannels(1)
      .audioFrequency(SAMPLE_RATE)
      .on('error', reject)
      .pipe(passThrough, { end: true })
  })
}

export async function detectYouTubeOffset(
  youtubeUrl: string,
  firstNote: string,
): Promise<number> {
  const SAMPLE_RATE = 22050
  const WINDOW = 2048
  const HOP = Math.floor(SAMPLE_RATE * 0.05) // 50ms hops
  const ANALYZE_SECS = 90

  const targetFreq = noteToFrequency(firstNote)
  const raw = await streamYouTubeAudio(youtubeUrl, ANALYZE_SECS)
  const samples = bandpassGuitarRange(raw, SAMPLE_RATE)

  const energyThreshold = 0.02
  let firstOnsetTime: number | null = null
  let prevRms = 0

  for (let i = 0; i + WINDOW < samples.length; i += HOP) {
    const window = samples.slice(i, i + WINDOW)
    const energy = rms(window)
    const time = i / SAMPLE_RATE

    const isOnset = energy > energyThreshold && energy > prevRms * 1.8
    prevRms = energy * 0.7 + prevRms * 0.3 // smoothed

    if (!isOnset) continue
    if (firstOnsetTime === null) firstOnsetTime = time

    if (targetFreq) {
      const pitch = yinPitch(window, SAMPLE_RATE)
      if (pitch !== null) {
        const ratio = pitch / targetFreq
        // Accept match within one octave up or down, within 8%
        const inRange = (ratio > 0.92 && ratio < 1.08) ||
          (ratio > 1.84 && ratio < 2.16) ||
          (ratio > 0.46 && ratio < 0.54)
        if (inRange) {
          return Math.round(time * 2) / 2 // round to 0.5s
        }
      }
    }
  }

  // Fallback to first energy onset
  if (firstOnsetTime !== null) {
    return Math.round(firstOnsetTime * 2) / 2
  }

  return 0
}
