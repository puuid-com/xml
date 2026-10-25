import { useLiveQuery } from '@tanstack/react-db'
import { useMemo } from 'react'

import { defaultsCollection } from '#/lib/store/defaults'
import type { DefaultRule } from '#/lib/xml/defaults'

/** All default-value rules, oldest first. */
export function useDefaults() {
  const { data } = useLiveQuery((q) =>
    q
      .from({ rule: defaultsCollection })
      .orderBy(({ rule }) => rule.createdAt, 'asc'),
  )
  return data
}

/** The rules that are switched on. */
export function useEnabledDefaults(): ReadonlyArray<DefaultRule> {
  const rules = useDefaults()
  return useMemo(() => rules.filter((r) => r.enabled), [rules])
}
