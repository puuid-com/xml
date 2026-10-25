import { useLiveQuery } from '@tanstack/react-db'
import { useMemo } from 'react'

import { highlightCss, highlightsCollection } from '#/lib/store/highlights'

/** All highlight rules, oldest first. */
export function useHighlights() {
  const { data } = useLiveQuery((q) =>
    q
      .from({ rule: highlightsCollection })
      .orderBy(({ rule }) => rule.createdAt, 'asc'),
  )
  return data
}

/** Enabled rules as tag name → CSS colour. */
export function useHighlightMap(): ReadonlyMap<string, string> {
  const rules = useHighlights()
  return useMemo(
    () =>
      new Map(
        rules
          .filter((r) => r.enabled)
          .map((r) => [r.tag, highlightCss(r.color)]),
      ),
    [rules],
  )
}
