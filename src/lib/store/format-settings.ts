import { z } from 'zod'

import type { SortOrder } from '#/lib/xml/format'

// Formatting preferences. Each profile keeps its own set.
export const formatSettingsSchema = z.object({
  formatOnSave: z.boolean(),
  removeEmptyLines: z.boolean(),
  trimVars: z.boolean(),
  stripPrefixes: z.boolean().default(false),
  sort: z.enum([
    'none',
    'asc',
    'desc',
    'custom',
  ]) satisfies z.ZodType<SortOrder>,
  /** Names for the custom sort, in order: tags or keys, and `@attr`. */
  customOrder: z.array(z.string()).default([]),
  highlightedFirst: z.boolean(),
  /** Show only the ends of values longer than `shortenAt` characters. */
  shortenValues: z.boolean().default(true),
  shortenAt: z.number().int().min(40).default(200),
  /** Tags whose value is a base64 ZPL label, linked to the ZPL viewer. */
  zplTags: z.array(z.string()).default([]),
})

export type FormatSettings = z.infer<typeof formatSettingsSchema>

export const DEFAULT_FORMAT: FormatSettings = {
  formatOnSave: false,
  removeEmptyLines: true,
  trimVars: false,
  stripPrefixes: false,
  sort: 'none',
  customOrder: [],
  highlightedFirst: false,
  shortenValues: true,
  shortenAt: 200,
  zplTags: [],
}

/** `format` with settings added after it was stored filled in. */
export function withDefaults(format: Partial<FormatSettings> | undefined) {
  return { ...DEFAULT_FORMAT, ...format }
}
