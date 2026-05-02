export interface LanguageEntry {
  label:     string
  variant:   'orange' | 'green' | 'blue' | 'violet' | 'yellow' | 'rose' | 'teal' | 'emerald' | 'zinc'
  /** Tailwind gradient for hero banner */
  hero:      string
  /** Tailwind color for the top accent bar on SongCard */
  bar:       string
  /** Tailwind gradient wash on SongCard hover */
  accent:    string
  /** Tailwind class for title text on SongCard hover */
  hoverText: string
  /** Tailwind text color for stat numbers on home page */
  statText:  string
}

export const LANGUAGE_CONFIG: Record<string, LanguageEntry> = {
  tamil:     { label: 'Tamil',     variant: 'orange',  hero: 'from-orange-900/20 via-zinc-900/0 to-transparent',  bar: 'bg-orange-500',  accent: 'from-orange-500/20 to-transparent',  hoverText: 'group-hover:text-orange-400',  statText: 'text-orange-400'  },
  malayalam: { label: 'Malayalam', variant: 'green',   hero: 'from-green-900/20 via-zinc-900/0 to-transparent',   bar: 'bg-green-500',   accent: 'from-green-500/15 to-transparent',   hoverText: 'group-hover:text-green-400',   statText: 'text-green-400'   },
  hindi:     { label: 'Hindi',     variant: 'blue',    hero: 'from-blue-900/20 via-zinc-900/0 to-transparent',    bar: 'bg-blue-500',    accent: 'from-blue-500/15 to-transparent',    hoverText: 'group-hover:text-blue-400',    statText: 'text-blue-400'    },
  telugu:    { label: 'Telugu',    variant: 'violet',  hero: 'from-violet-900/20 via-zinc-900/0 to-transparent',  bar: 'bg-violet-500',  accent: 'from-violet-500/15 to-transparent',  hoverText: 'group-hover:text-violet-400',  statText: 'text-violet-400'  },
  kannada:   { label: 'Kannada',   variant: 'yellow',  hero: 'from-yellow-900/20 via-zinc-900/0 to-transparent',  bar: 'bg-yellow-500',  accent: 'from-yellow-500/15 to-transparent',  hoverText: 'group-hover:text-yellow-400',  statText: 'text-yellow-400'  },
  bengali:   { label: 'Bengali',   variant: 'rose',    hero: 'from-rose-900/20 via-zinc-900/0 to-transparent',    bar: 'bg-rose-500',    accent: 'from-rose-500/15 to-transparent',    hoverText: 'group-hover:text-rose-400',    statText: 'text-rose-400'    },
  punjabi:   { label: 'Punjabi',   variant: 'teal',    hero: 'from-teal-900/20 via-zinc-900/0 to-transparent',    bar: 'bg-teal-500',    accent: 'from-teal-500/15 to-transparent',    hoverText: 'group-hover:text-teal-400',    statText: 'text-teal-400'    },
  marathi:   { label: 'Marathi',   variant: 'emerald', hero: 'from-emerald-900/20 via-zinc-900/0 to-transparent', bar: 'bg-emerald-500', accent: 'from-emerald-500/15 to-transparent', hoverText: 'group-hover:text-emerald-400', statText: 'text-emerald-400' },
}

export const DEFAULT_LANGUAGE: LanguageEntry = {
  label: 'Other', variant: 'zinc',
  hero:      'from-zinc-800/20 via-zinc-900/0 to-transparent',
  bar:       'bg-zinc-700',
  accent:    'from-zinc-500/10 to-transparent',
  hoverText: 'group-hover:text-zinc-300',
  statText:  'text-zinc-400',
}

export function getLanguage(lang: string | null | undefined): LanguageEntry {
  return LANGUAGE_CONFIG[lang ?? ''] ?? DEFAULT_LANGUAGE
}
