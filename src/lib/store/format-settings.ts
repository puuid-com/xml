import { persistedStore } from './persist'
import type { SortOrder } from '#/lib/xml/format'

// Formatting preferences, shared by every file and kept across visits.
interface FormatSettings {
  formatOnSave: boolean
  removeEmptyLines: boolean
  trimVars: boolean
  sort: SortOrder
  highlightedFirst: boolean
}

export const formatSettingsStore = persistedStore<FormatSettings>(
  'format',
  () => localStorage,
  {
    formatOnSave: false,
    removeEmptyLines: true,
    trimVars: false,
    sort: 'none',
    highlightedFirst: false,
  },
)

export function setFormatSetting<TKey extends keyof FormatSettings>(
  key: TKey,
  value: FormatSettings[TKey],
) {
  formatSettingsStore.setState((s) => ({ ...s, [key]: value }))
}
