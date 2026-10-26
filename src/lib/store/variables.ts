import { z } from 'zod'

import { localCollection, newId } from './persist'
import { activeProfileId } from './profiles'

export const variableSchema = z.object({
  id: z.string(),
  /** Name as written between the brackets: `host` for `<<host>>`. */
  name: z.string(),
  /** Literal text that replaces the variable. */
  value: z.string(),
  createdAt: z.number(),
  profileId: z.string(),
})

export type Variable = z.infer<typeof variableSchema>

// Per profile, synced across browser tabs like the defaults.
export const variablesCollection = localCollection('variables', variableSchema)

/** Names a plain `<<name>>` variable can have; `$` is kept for dynamic ones. */
export const VARIABLE_NAME = /^[A-Za-z_][\w.-]{0,63}$/

export function isVariableName(name: string) {
  return VARIABLE_NAME.test(name)
}

/** A profile's variables; the active file's profile by default. */
export function profileVariables(profileId = activeProfileId()) {
  return [...variablesCollection.values()].filter(
    (v) => v.profileId === profileId,
  )
}

export function findVariable(name: string, profileId = activeProfileId()) {
  return profileVariables(profileId).find((v) => v.name === name)
}

/** Name to value, for resolving a document. */
export function variableValues(
  profileId = activeProfileId(),
): Map<string, string> {
  return new Map(profileVariables(profileId).map((v) => [v.name, v.value]))
}

/** Adds `name` to the profile, or updates its value. */
export function setVariable(
  name: string,
  value: string,
  profileId = activeProfileId(),
) {
  if (!isVariableName(name)) return
  const existing = findVariable(name, profileId)
  if (existing) {
    updateVariableValue(existing.id, value)
    return
  }
  variablesCollection.insert({
    id: newId(),
    name,
    value,
    createdAt: Date.now(),
    profileId,
  })
}

export function updateVariableValue(id: string, value: string) {
  variablesCollection.update(id, (draft) => {
    draft.value = value
  })
}

export function removeVariable(id: string) {
  if (variablesCollection.has(id)) variablesCollection.delete(id)
}
