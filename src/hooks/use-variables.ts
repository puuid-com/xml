import { eq, useLiveQuery } from '@tanstack/react-db'
import { useMemo } from 'react'

import { useActiveProfileId } from './use-profiles'
import { variablesCollection } from '#/lib/store/variables'

/** Variables of the active profile, oldest first. */
export function useVariables() {
  const profileId = useActiveProfileId()
  const { data } = useLiveQuery({
    query: (q) =>
      q
        .from({ variable: variablesCollection })
        .where(({ variable }) => eq(variable.profileId, profileId))
        .orderBy(({ variable }) => variable.createdAt, 'asc'),
  })
  return data
}

/** Name to value for the active profile. */
export function useVariableValues(): ReadonlyMap<string, string> {
  const variables = useVariables()
  return useMemo(
    () => new Map(variables.map((v) => [v.name, v.value])),
    [variables],
  )
}
