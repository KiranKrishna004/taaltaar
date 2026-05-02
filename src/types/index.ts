export type Language = 'tamil' | 'malayalam'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export interface TabNote {
  time: number
  string: number
  fret: number
  duration: number
  note: string
  midi?: number
}

export interface Song {
  id: string
  title: string
  film: string
  language: Language
  composer: string
  difficulty: Difficulty
  bpm: number
  alphatex: string
  tab_data: TabNote[]
  youtube_url: string | null
  youtube_offset: number
  play_count: number
  created_at: string
}

export interface Recording {
  id: string
  song_id: string
  audio_url: string | null
  score: number
  upvotes: number
  device_fingerprint: string
  flagged_count: number
  hidden: boolean
  created_at: string
}

export interface Badge {
  id: string
  emoji: string
  name: string
  description: string
  earned: boolean
}
