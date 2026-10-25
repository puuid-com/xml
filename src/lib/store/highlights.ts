import {
  createCollection,
  localStorageCollectionOptions,
} from '@tanstack/react-db'
import { z } from 'zod'

import { newId } from './files'

/** Preset swatches; each maps to a `--hl-<name>` token in styles.css. */
export const HIGHLIGHT_PRESETS = [
  'blue',
  'purple',
  'pink',
  'red',
  'amber',
  'green',
  'teal',
  'gray',
] as const

export type HighlightPreset = (typeof HIGHLIGHT_PRESETS)[number]

export const highlightSchema = z.object({
  id: z.string(),
  /** Exact tag name, prefix included (`soap:Body`). */
  tag: z.string(),
  /** A preset name or a `#rrggbb` custom colour. */
  color: z.string(),
  enabled: z.boolean(),
  createdAt: z.number(),
})

export type Highlight = z.infer<typeof highlightSchema>

// Global across files, synced across browser tabs like the files.
export const highlightsCollection = createCollection(
  localStorageCollectionOptions({
    id: 'highlights',
    storageKey: 'xml-editor:highlights',
    getKey: (rule) => rule.id,
    schema: highlightSchema,
  }),
)

export function isPreset(color: string): color is HighlightPreset {
  return (HIGHLIGHT_PRESETS as ReadonlyArray<string>).includes(color)
}

/** CSS colour for a stored highlight colour. */
export function highlightCss(color: string) {
  return isPreset(color) ? `var(--hl-${color})` : color
}

/** Next preset not yet used, so new rules get distinct colours. */
export function nextPreset(): HighlightPreset {
  const used = new Set([...highlightsCollection.values()].map((r) => r.color))
  return HIGHLIGHT_PRESETS.find((p) => !used.has(p)) ?? HIGHLIGHT_PRESETS[0]
}

export function findHighlight(tag: string) {
  return [...highlightsCollection.values()].find((r) => r.tag === tag)
}

/** Adds or recolours the rule for `tag`. */
export function setHighlight(tag: string, color: string = nextPreset()) {
  const existing = findHighlight(tag)
  if (existing) {
    highlightsCollection.update(existing.id, (draft) => {
      draft.color = color
      draft.enabled = true
    })
    return
  }
  highlightsCollection.insert({
    id: newId(),
    tag,
    color,
    enabled: true,
    createdAt: Date.now(),
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
