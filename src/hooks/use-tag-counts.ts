import { useSelector } from '@tanstack/react-store'

import { editorStore } from '#/components/editor/editor-store'
import { localName } from '#/lib/names'
import { allElements } from '#/lib/xml/locate'
import { hasName } from '#/lib/xml/model'

/** Local tag name (no prefix) → number of elements with it in the active document. */
export function useTagCounts(): ReadonlyMap<string, number> {
  const doc = useSelector(editorStore, (s) => s.doc)
  const counts = new Map<string, number>()
  for (const el of allElements(doc.nodes)) {
    if (!hasName(el)) continue
    const name = localName(el.name)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return counts
}
