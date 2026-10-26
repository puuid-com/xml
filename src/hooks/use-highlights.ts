import { eq, useLiveQuery } from '@tanstack/react-db'
import { useMemo } from 'react'

import { useActiveProfileId } from './use-profiles'
import { localName } from '#/lib/names'
import { highlightCss, highlightsCollection } from '#/lib/store/highlights'

/** Highlight rules of the active profile, oldest first. */
export function useHighlights() {
  const profileId = useActiveProfileId()
  const { data } = useLiveQuery({
    query: (q) =>
      q
        .from({ rule: highlightsCollection })
        .where(({ rule }) => eq(rule.profileId, profileId))
        .orderBy(({ rule }) => rule.createdAt, 'asc'),
  })
  return data
}

/** Enabled rules as local tag name (no prefix) → CSS colour. */
export function useHighlightMap(): ReadonlyMap<string, string> {
  const rules = useHighlights()
  return useMemo(
    () =>
      new Map(
        rules
          .filter((r) => r.enabled)
          .map((r) => [localName(r.tag), highlightCss(r.color)]),
      ),
    [rules],
  )
}
