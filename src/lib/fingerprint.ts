'use client'

export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return ''

  const stored = localStorage.getItem('taal_device_id')
  if (stored) return stored

  const raw = [
    navigator.userAgent,
    screen.width.toString(),
    screen.height.toString(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|')

  // Simple hash
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  const id = Math.abs(hash).toString(36) + Date.now().toString(36)
  localStorage.setItem('taal_device_id', id)
  return id
}
