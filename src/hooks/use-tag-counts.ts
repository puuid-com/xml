import { useSelector } from '@tanstack/react-store'

import { editorStore } from '#/components/editor/editor-store'
import { allElements } from '#/lib/xml/locate'
import { hasName } from '#/lib/xml/model'

/** Tag name → number of elements with it in the active document. */
export function useTagCounts(): ReadonlyMap<string, number> {
  const doc = useSelector(editorStore, (s) => s.doc)
  const counts = new Map<string, number>()
  for (const el of allElements(doc.nodes)) {
    if (!hasName(el)) continue
    counts.set(el.name, (counts.get(el.name) ?? 0) + 1)
  }
  return counts
}
