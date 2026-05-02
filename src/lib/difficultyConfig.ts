export interface DifficultyEntry {
  label:   string
  variant: 'emerald' | 'amber' | 'red' | 'zinc'
  dots:    number
}

export const DIFFICULTY_CONFIG: Record<string, DifficultyEntry> = {
  beginner:     { label: 'Beginner',     variant: 'emerald', dots: 1 },
  intermediate: { label: 'Intermediate', variant: 'amber',   dots: 2 },
  advanced:     { label: 'Advanced',     variant: 'red',     dots: 3 },
}

export const DEFAULT_DIFFICULTY: DifficultyEntry = { label: 'Unknown', variant: 'zinc', dots: 0 }

export function getDifficulty(difficulty: string | null | undefined): DifficultyEntry {
  return DIFFICULTY_CONFIG[difficulty ?? ''] ?? DEFAULT_DIFFICULTY
}
