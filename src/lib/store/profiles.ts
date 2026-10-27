import { z } from 'zod'

import { highlightCss, unusedPreset } from './colors'
import { filesCollection } from './files'
import {
  DEFAULT_FORMAT,
  formatSettingsSchema,
  withDefaults,
} from './format-settings'
import { DEFAULT_PROFILE_ID, localCollection, newId } from './persist'
import { sessionStore } from './session'
import { sameName } from '#/lib/names'
import { appendNames } from '#/lib/sort-order'
import { m } from '#/paraglide/messages'
import type { FormatSettings } from './format-settings'

// A profile is a named set of settings: format options here, plus the
// highlight, pin and default-value rules tagged with its id. Each file
// belongs to one profile, and the editor uses the settings of the open file.

export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** A preset name or a `#rrggbb` custom colour, like highlights. */
  color: z.string(),
  createdAt: z.number(),
  format: formatSettingsSchema,
})

export type Profile = z.infer<typeof profileSchema>

/** Where format settings lived before profiles. */
const LEGACY_FORMAT_KEY = 'xml-editor:format'

// The first visit, or the first since profiles, starts with one profile that
// owns every existing setting.
function defaultProfile(): Profile {
  let legacy: unknown = null
  try {
    legacy = JSON.parse(localStorage.getItem(LEGACY_FORMAT_KEY) ?? 'null')
    localStorage.removeItem(LEGACY_FORMAT_KEY)
  } catch {
    // Unreadable old settings; start from the defaults.
  }
  const format = formatSettingsSchema.safeParse({
    ...DEFAULT_FORMAT,
    ...(legacy && typeof legacy === 'object' ? legacy : {}),
  })
  return {
    id: DEFAULT_PROFILE_ID,
    name: m.profile_default_name(),
    color: 'blue',
    createdAt: 0,
    format: format.success ? format.data : DEFAULT_FORMAT,
  }
}

export const profilesCollection = localCollection('profiles', profileSchema, {
  // Older versions saved only the format settings that existed then.
  upgrade: (row) => ({
    ...row,
    format: withDefaults(row.format as Partial<FormatSettings> | undefined),
  }),
  initial: () => [defaultProfile()],
})

export function compareProfiles(a: Profile, b: Profile) {
  return a.createdAt - b.createdAt || a.id.localeCompare(b.id)
}

/** Every profile, oldest first. */
export function profilesList() {
  return [...profilesCollection.values()].sort(compareProfiles)
}

/** The profile with `id`, else the first, so files of a lost profile still work. */
export function resolveProfile(
  profiles: ReadonlyArray<Profile>,
  id: string | null | undefined,
) {
  return profiles.find((p) => p.id === id) ?? profiles.at(0)
}

/** The profile of the active file. */
export function activeProfile() {
  const fileId = sessionStore.state.activeId
  const file = fileId ? filesCollection.get(fileId) : undefined
  return resolveProfile(profilesList(), file?.profileId)
}

export function activeProfileId() {
  return activeProfile()?.id ?? DEFAULT_PROFILE_ID
}

export function activeFormat(): FormatSettings {
  return withDefaults(activeProfile()?.format)
}

export function setFormatSetting<TKey extends keyof FormatSettings>(
  key: TKey,
  value: FormatSettings[TKey],
) {
  const profile = activeProfile()
  if (!profile) return
  profilesCollection.update(profile.id, (draft) => {
    draft.format = { ...withDefaults(draft.format), [key]: value }
  })
}

/** Replaces the active profile's custom sort order. */
export function setCustomOrder(order: Array<string>) {
  setFormatSetting('customOrder', order)
}

/**
 * Adds names to the end of the custom order and switches to it, since the
 * order does nothing under another sort.
 */
export function addToCustomOrder(names: Iterable<string>) {
  const profile = activeProfile()
  if (!profile) return
  profilesCollection.update(profile.id, (draft) => {
    const format = withDefaults(draft.format)
    draft.format = {
      ...format,
      sort: 'custom',
      customOrder: appendNames(format.customOrder, names),
    }
  })
}

export function removeFromCustomOrder(name: string) {
  setCustomOrder(activeFormat().customOrder.filter((n) => !sameName(n, name)))
}

/** CSS colour of a profile's tag. */
export function profileCss(profile: Pick<Profile, 'color'>) {
  return highlightCss(profile.color)
}

/** First preset colour no profile uses yet. */
export function nextProfileColor() {
  return unusedPreset([...profilesCollection.values()].map((p) => p.color))
}

export function createProfile({
  name,
  color = nextProfileColor(),
  format = DEFAULT_FORMAT,
}: {
  name: string
  color?: string
  format?: FormatSettings
}): Profile {
  const profile: Profile = {
    id: newId(),
    name: name.trim() || m.profile_untitled(),
    color,
    // Never sorts before an older profile, even within one millisecond.
    createdAt: Math.max(
      Date.now(),
      (profilesList().at(-1)?.createdAt ?? 0) + 1,
    ),
    format: withDefaults(format),
  }
  profilesCollection.insert(profile)
  return profile
}

export function updateProfile(
  id: string,
  changes: Partial<Pick<Profile, 'name' | 'color'>>,
) {
  if (!profilesCollection.has(id)) return
  const name = changes.name?.trim()
  profilesCollection.update(id, (draft) => {
    if (name) draft.name = name
    if (changes.color) draft.color = changes.color
  })
}
