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
