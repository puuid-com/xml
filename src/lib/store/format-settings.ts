import { Store } from '@tanstack/store'

import { singleton } from './singleton'
import type { SortOrder } from '#/lib/xml/format'

// Formatting preferences, shared by every file and kept across visits.
export interface FormatSettings {
  formatOnSave: boolean
  removeEmptyLines: boolean
  trimVars: boolean
  sort: SortOrder
}

const STORAGE_KEY = 'xml-editor:format'

const initial: FormatSettings = {
  formatOnSave: false,
  removeEmptyLines: true,
  trimVars: false,
  sort: 'none',
}

function load(): FormatSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...initial, ...(JSON.parse(raw) as FormatSettings) }
  } catch {
    // No storage (SSR, private mode); use defaults.
  }
  return initial
}

export const formatSettingsStore = singleton('formatSettings', () => {
  const store = new Store<FormatSettings>(load())
  store.subscribe(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store.state))
    } catch {
      // Ignore quota or unavailable storage.
    }
  })
  return store
})

export function setFormatSetting<TKey extends keyof FormatSettings>(
  key: TKey,
  value: FormatSettings[TKey],
) {
  formatSettingsStore.setState((s) => ({ ...s, [key]: value }))
}
