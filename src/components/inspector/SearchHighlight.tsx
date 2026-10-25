import { createContext, use } from 'react'

import { matchRanges } from './tree-search'

const SearchNeedle = createContext('')

/** Sets the normalised search needle that `Highlighted` marks below it. */
export function SearchHighlightProvider({
  needle,
  children,
}: {
  needle: string
  children: React.ReactNode
}) {
  return <SearchNeedle value={needle}>{children}</SearchNeedle>
}

/** Renders `text` with occurrences of the current search needle marked. */
export function Highlighted({ text }: { text: string }) {
  const needle = use(SearchNeedle)
  const ranges = matchRanges(text, needle)
  if (ranges.length === 0) return text

  const parts: Array<React.ReactNode> = []
  let last = 0
  for (const [from, to] of ranges) {
    if (from > last) parts.push(text.slice(last, from))
    parts.push(
      <mark key={from} className="search-hit">
        {text.slice(from, to)}
      </mark>,
    )
    last = to
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}
