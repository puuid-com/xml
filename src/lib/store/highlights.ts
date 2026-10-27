import { z } from 'zod'

import { unusedPreset } from './colors'
import { localCollection, newId, withDefaultProfile } from './persist'
import { activeProfileId } from './profiles'
import { localName, sameName } from '#/lib/names'
import type { HighlightPreset } from './colors'

export { HIGHLIGHT_PRESETS, highlightCss, isPreset } from './colors'
export type { HighlightPreset } from './colors'

export const highlightSchema = z.object({
  id: z.string(),
  /** Tag name without its prefix (`Body` for `soap:Body`); see `#/lib/names`. */
  tag: z.string(),
  /** A preset name or a `#rrggbb` custom colour. */
  color: z.string(),
  enabled: z.boolean(),
  createdAt: z.number(),
  profileId: z.string(),
})

export type Highlight = z.infer<typeof highlightSchema>

// Per profile, synced across browser tabs like the files.
export const highlightsCollection = localCollection(
  'highlights',
  highlightSchema,
  {
    upgrade: withDefaultProfile,
  },
)

/** A profile's rules; the active file's profile by default. */
export function profileHighlights(profileId = activeProfileId()) {
  return [...highlightsCollection.values()].filter(
    (r) => r.profileId === profileId,
  )
}

/** Next preset not yet used, so new rules get distinct colours. */
export function nextPreset(profileId = activeProfileId()): HighlightPreset {
  return unusedPreset(profileHighlights(profileId).map((r) => r.color))
}

export function findHighlight(tag: string, profileId = activeProfileId()) {
  return profileHighlights(profileId).find((r) => sameName(r.tag, tag))
}

/** Adds or recolours the rule for `tag` in the active profile. */
export function setHighlight(tag: string, color?: string) {
  const profileId = activeProfileId()
  color ??= nextPreset(profileId)
  const existing = findHighlight(tag, profileId)
  if (existing) {
    highlightsCollection.update(existing.id, (draft) => {
      draft.tag = localName(tag)
      draft.color = color
      draft.enabled = true
    })
    return
  }
  highlightsCollection.insert({
    id: newId(),
    tag: localName(tag),
    color,
    enabled: true,
    createdAt: Date.now(),
    profileId,
  })
}

export function toggleHighlight(id: string) {
  highlightsCollection.update(id, (draft) => {
    draft.enabled = !draft.enabled
  })
}

export function removeHighlight(id: string) {
  if (highlightsCollection.has(id)) highlightsCollection.delete(id)
}

/** Rules grouped by colour (case-insensitive), in order of first appearance. */
export function groupByColor<T extends { color: string }>(
  rules: ReadonlyArray<T>,
): Array<Array<T>> {
  const groups = new Map<string, Array<T>>()
  for (const rule of rules) {
    const key = rule.color.toLowerCase()
    const group = groups.get(key)
    if (group) group.push(rule)
    else groups.set(key, [rule])
  }
  return [...groups.values()]
}

function colorGroup(color: string, profileId = activeProfileId()) {
  const key = color.toLowerCase()
  return profileHighlights(profileId).filter(
    (r) => r.color.toLowerCase() === key,
  )
}

/** Recolours every rule of the active profile that uses `from`. */
export function recolorGroup(from: string, to: string) {
  for (const rule of colorGroup(from)) {
    highlightsCollection.update(rule.id, (draft) => {
      draft.color = to
    })
  }
}

/** Shows or hides every rule of the active profile that uses `color`. */
export function setGroupEnabled(color: string, enabled: boolean) {
  for (const rule of colorGroup(color)) {
    if (rule.enabled === enabled) continue
    highlightsCollection.update(rule.id, (draft) => {
      draft.enabled = enabled
    })
  }
}
