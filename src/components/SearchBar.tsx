'use client'
import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props {
  onSearch: (query: string) => void
}

export default function SearchBar({ onSearch }: Props) {
  const [value, setValue] = useState('')

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
    onSearch(e.target.value)
  }, [onSearch])

  return (
    <div className="relative group">
      <svg
        className={cn(
          'absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors',
          value ? 'text-amber-400' : 'text-zinc-500 group-focus-within:text-amber-400'
        )}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>

      <Input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Search songs, films, composers…"
        className="pl-11 pr-10"
      />

      {value && (
        <button
          onClick={() => { setValue(''); onSearch('') }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors w-6 h-6 flex items-center justify-center rounded-md hover:bg-zinc-800"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
