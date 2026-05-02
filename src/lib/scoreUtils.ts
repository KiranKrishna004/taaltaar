export function stars(score: number): string {
  if (score >= 90) return '⭐⭐⭐⭐'
  if (score >= 75) return '⭐⭐⭐'
  if (score >= 50) return '⭐⭐'
  return '⭐'
}

export function scoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-400'
  if (score >= 75) return 'text-amber-400'
  if (score >= 50) return 'text-yellow-400'
  return 'text-zinc-400'
}
