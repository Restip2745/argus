import type { ReactNode } from 'react'

/**
 * Returns an array of spans where matched substrings are wrapped in
 * <mark> elements with class="search-highlight". Safe for React render.
 * Returns the original string (as a single text node) when query is empty.
 */
export function highlightText(text: string, query: string): ReactNode {
  if (!query.trim()) return text
  const lower = query.trim().toLowerCase()
  const parts: ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    const idx = remaining.toLowerCase().indexOf(lower)
    if (idx === -1) { parts.push(remaining); break }
    if (idx > 0) parts.push(remaining.slice(0, idx))
    parts.push(
      <mark key={key++} className="search-highlight">
        {remaining.slice(idx, idx + lower.length)}
      </mark>
    )
    remaining = remaining.slice(idx + lower.length)
  }

  return <>{parts}</>
}
