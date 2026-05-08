export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export function heatColor(score: number): string {
  if (score >= 1.5) return '#ff4d4d'
  if (score >= 1.0) return '#ff9c2a'
  if (score >= 0.5) return '#00d4ff'
  if (score >= 0.3) return '#4a9eff'
  return '#2a4060'
}
