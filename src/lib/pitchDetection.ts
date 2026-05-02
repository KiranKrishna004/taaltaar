// Pitch detection utilities using YIN via pitchfinder

const NOTE_FREQ_TABLE: Record<string, number> = (() => {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const table: Record<string, number> = {}
  for (let midi = 0; midi < 128; midi++) {
    const name = names[midi % 12]
    const octave = Math.floor(midi / 12) - 1
    table[`${name}${octave}`] = 440 * Math.pow(2, (midi - 69) / 12)
  }
  return table
})()

export function noteToFrequency(note: string): number | null {
  return NOTE_FREQ_TABLE[note] ?? null
}

export function frequencyToNote(frequency: number): string {
  const midiNote = 12 * Math.log2(frequency / 440) + 69
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const midi = Math.round(midiNote)
  const octave = Math.floor(midi / 12) - 1
  const name = noteNames[midi % 12]
  return `${name}${octave}`
}

export function notesMatch(detected: string, expected: string): boolean {
  // Strip octave for more forgiving matching
  const detectedName = detected.replace(/\d/g, '')
  const expectedName = expected.replace(/\d/g, '')
  return detectedName === expectedName
}
