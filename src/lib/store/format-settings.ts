import { z } from 'zod'

import type { SortOrder } from '#/lib/xml/format'

// Formatting preferences. Each profile keeps its own set.
export const formatSettingsSchema = z.object({
  formatOnSave: z.boolean(),
  removeEmptyLines: z.boolean(),
  trimVars: z.boolean(),
  sort: z.enum([
    'none',
    'asc',
    'desc',
    'custom',
  ]) satisfies z.ZodType<SortOrder>,
  /** Names for the custom sort, in order: tags or keys, and `@attr`. */
  customOrder: z.array(z.string()).default([]),
  highlightedFirst: z.boolean(),
})

export type FormatSettings = z.infer<typeof formatSettingsSchema>

export const DEFAULT_FORMAT: FormatSettings = {
  formatOnSave: false,
  removeEmptyLines: true,
  trimVars: false,
  sort: 'none',
  customOrder: [],
  highlightedFirst: false,
}

/** `format` with settings added after it was stored filled in. */
export function withDefaults(format: Partial<FormatSettings> | undefined) {
  return { ...DEFAULT_FORMAT, ...format }
}
