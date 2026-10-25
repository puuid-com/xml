import { z } from 'zod'

import type { SortOrder } from '#/lib/xml/format'

// Formatting preferences. Each profile keeps its own set.
export const formatSettingsSchema = z.object({
  formatOnSave: z.boolean(),
  removeEmptyLines: z.boolean(),
  trimVars: z.boolean(),
  sort: z.enum(['none', 'asc', 'desc']) satisfies z.ZodType<SortOrder>,
  highlightedFirst: z.boolean(),
})

export type FormatSettings = z.infer<typeof formatSettingsSchema>

export const DEFAULT_FORMAT: FormatSettings = {
  formatOnSave: false,
  removeEmptyLines: true,
  trimVars: false,
  sort: 'none',
  highlightedFirst: false,
}
