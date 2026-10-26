import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as profiles from './profiles'
import type * as profileActions from './profile-actions'
import type * as files from './files'
import type * as highlights from './highlights'
import type * as pins from './pins'
import type * as defaults from './defaults'
import type * as variables from './variables'
import type * as session from './session'
import type * as switching from '#/components/profiles/actions'

// Modules load after storage holds data from before profiles, to test the
// migration, so they are imported dynamically.
type Store = typeof profiles &
  typeof profileActions &
  typeof files &
  typeof highlights &
  typeof pins &
  typeof defaults &
  typeof variables &
  typeof session &
  typeof switching

let s: Store

function legacyItem(data: Record<string, unknown>) {
  return { versionKey: crypto.randomUUID(), data }
}

beforeAll(async () => {
  localStorage.clear()
  localStorage.setItem(
    'xml-editor:format',
    JSON.stringify({ formatOnSave: true, sort: 'asc' }),
  )
  localStorage.setItem(
    'xml-editor:highlights',
    JSON.stringify({
      's:h1': legacyItem({
        id: 'h1',
        tag: 'item',
        color: 'red',
        enabled: true,
        createdAt: 1,
      }),
    }),
  )
  localStorage.setItem(
    'xml-editor:files',
    JSON.stringify({
      's:f1': legacyItem({
        id: 'f1',
        name: 'old.xml',
        content: '<a/>',
        order: 1,
        writer: 'x',
        deletedAt: null,
      }),
    }),
  )
  vi.resetModules()
  ;(globalThis as Record<string, unknown>).__xmlEditorSingletons = undefined
  s = Object.assign(
    {},
    await import('./profiles'),
    await import('./profile-actions'),
    await import('./files'),
    await import('./highlights'),
    await import('./pins'),
    await import('./defaults'),
    await import('./variables'),
    await import('./session'),
    await import('#/components/profiles/actions'),
  )
})

describe('migration', () => {
  it('moves existing settings into a default profile', () => {
    const [profile] = s.profilesList()
    expect(profile).toMatchObject({ id: 'default', name: 'Default' })
    expect(profile.format).toMatchObject({ formatOnSave: true, sort: 'asc' })
    expect(localStorage.getItem('xml-editor:format')).toBeNull()
    expect(s.highlightsCollection.get('h1')?.profileId).toBe('default')
    expect(s.filesCollection.get('f1')?.profileId).toBe('default')
  })
})

describe('profiles', () => {
  beforeEach(() => {
    for (const profile of s.profilesList().slice(1)) {
      s.profilesCollection.delete(profile.id)
    }
    for (const file of [...s.filesCollection.values()]) {
      s.filesCollection.delete(file.id)
    }
    s.setActive(null)
  })

  it('gives each file the settings of its own profile', async () => {
    const work = s.createProfile({ name: 'Work' })
    const a = s.createFile('a.xml')
    const b = s.createFile('b.xml', '', work.id)

    s.setActive(a.id)
    s.setHighlight('price')
    s.pinTag('total')
    s.setDefault('currency', 'CAD')
    s.setFormatSetting('trimVars', true)

    s.setActive(b.id)
    expect(s.activeProfileId()).toBe(work.id)
    expect(s.findHighlight('price')).toBeUndefined()
    expect(s.findPin('total')).toBeUndefined()
    expect(s.enabledDefaults()).toEqual([])
    expect(s.activeFormat().trimVars).toBe(false)

    await s.switchProfile('default')
    expect(s.findHighlight('price')).toBeDefined()
    expect(s.activeFormat().trimVars).toBe(true)
    expect(s.filesCollection.get(b.id)?.profileId).toBe('default')
  })

  it('clones every setting and rule into an independent profile', () => {
    const file = s.createFile('a.xml')
    s.setActive(file.id)
    s.setHighlight('id', 'teal')
    s.pinTag('name')
    s.setVariable('host', 'dev.example.com')
    s.setFormatSetting('removeEmptyLines', false)

    const copy = s.cloneProfile('default', { name: 'Copy' })!
    expect(copy.format.removeEmptyLines).toBe(false)
    expect(s.findHighlight('id', copy.id)?.color).toBe('teal')
    expect(s.findPin('name', copy.id)).toBeDefined()
    expect(s.findVariable('host', copy.id)?.value).toBe('dev.example.com')

    s.setHighlight('id', 'red')
    s.setVariable('host', 'prod.example.com', copy.id)
    expect(s.findHighlight('id', copy.id)?.color).toBe('teal')
    expect(s.variableValues().get('host')).toBe('dev.example.com')
    expect(s.variableValues(copy.id).get('host')).toBe('prod.example.com')
  })

  it('deletes a profile with its rules and moves its files', async () => {
    const temp = s.createProfile({ name: 'Temp' })
    const file = s.createFile('a.xml', '', temp.id)
    s.setActive(file.id)
    s.setHighlight('gone')
    s.setVariable('gone', 'x')

    expect(await s.deleteProfile(temp.id)).toMatchObject({ id: 'default' })
    expect(s.profilesCollection.has(temp.id)).toBe(false)
    expect(s.filesCollection.get(file.id)?.profileId).toBe('default')
    expect(
      [...s.highlightsCollection.values()].some((r) => r.tag === 'gone'),
    ).toBe(false)
    expect(
      [...s.variablesCollection.values()].some((v) => v.name === 'gone'),
    ).toBe(false)

    expect(await s.deleteProfile('default')).toBeUndefined()
    expect(s.profilesCollection.has('default')).toBe(true)
  })

  it('cycles and picks profiles for the active file', () => {
    const second = s.createProfile({ name: 'Second' })
    const file = s.createFile('a.xml')
    s.setActive(file.id)

    s.switchToNextProfile()
    return vi.waitFor(() => {
      expect(s.activeProfileId()).toBe(second.id)
      s.switchToProfileAt(0)
      return vi.waitFor(() => expect(s.activeProfileId()).toBe('default'))
    })
  })

  it('keeps a profile switch made while a content save is pending', async () => {
    const other = s.createProfile({ name: 'Other' })
    const file = s.createFile('a.xml', '<old/>')
    const pending = s.saveContent({ id: file.id, content: '<new/>' })
    await s.setFileProfile(file.id, other.id)
    await pending.isPersisted.promise
    expect(s.filesCollection.get(file.id)).toMatchObject({
      content: '<new/>',
      profileId: other.id,
    })
    expect(localStorage.getItem('xml-editor:files')).toContain(other.id)
  })
})
