import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { OpenSharedDialog } from './ShareDialog'
import { encodeShare } from '#/lib/share'
import { filesCollection } from '#/lib/store/files'
import { DEFAULT_FORMAT } from '#/lib/store/format-settings'
import { profileHighlights } from '#/lib/store/highlights'
import { profilesCollection } from '#/lib/store/profiles'
import { workspaceReady } from '#/lib/store/workspace'

beforeAll(() => workspaceReady())

const profile = {
  id: 'shared-profile',
  name: 'Partner',
  color: 'teal',
  format: DEFAULT_FORMAT,
  highlights: [{ tag: 'price', color: 'red', enabled: true }],
  pins: [],
  defaults: [],
}

afterEach(() => {
  window.location.hash = ''
  for (const file of [...filesCollection.values()]) {
    filesCollection.delete(file.id)
  }
  if (profilesCollection.has(profile.id)) profilesCollection.delete(profile.id)
})

describe('OpenSharedDialog', () => {
  it('adds the profile a link carries and opens the file in it', async () => {
    window.location.hash = await encodeShare({
      name: 'order.xml',
      content: '<order/>',
      profile,
    })
    render(<OpenSharedDialog />)
    const add = await screen.findByRole('radio', {
      name: /Add it as a new profile/,
    })
    expect(add).toBeChecked()
    expect(
      screen.getByRole('radio', { name: /Use my current profile/ }),
    ).toBeInTheDocument()
    expect(screen.getByText(/No variable values/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    const file = [...filesCollection.values()].find(
      (f) => f.name === 'order.xml',
    )
    expect(file?.profileId).toBe(profile.id)
    expect(profilesCollection.get(profile.id)?.name).toBe('Partner')
    expect(profileHighlights(profile.id).map((r) => r.tag)).toEqual(['price'])
  })
})
