'use client'

import { cn } from '@/lib/utils'

type Filter = 'all' | 'tamil' | 'malayalam' | 'beginner' | 'intermediate' | 'advanced'

interface Props {
  active: Filter
  onChange: (filter: Filter) => void
}

const filters: { value: Filter; label: string }[] = [
  { value: 'all',          label: 'All' },
  { value: 'tamil',        label: '🟠 Tamil' },
  { value: 'malayalam',    label: '🟢 Malayalam' },
  { value: 'beginner',     label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced' },
]

export default function FilterBar({ active, onChange }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map(f => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
            active === f.value
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
