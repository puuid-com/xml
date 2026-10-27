import { beforeAll, describe, expect, it } from 'vitest'

import { diskStore, loadDiskLinks, setDiskLink } from './disk'
import { workspaceReady } from './workspace'

beforeAll(() => workspaceReady())

// Plain objects stand in for handles: IndexedDB stores anything it can clone.
const handle = (name: string) =>
  ({ kind: 'file', name }) as unknown as FileSystemFileHandle

describe('links to files on disk', () => {
  it('keeps links across loads and drops those of missing files', async () => {
    await setDiskLink('a', {
      handle: handle('a.xml'),
      saved: '<a/>',
      modified: 1,
    })
    await setDiskLink('b', {
      handle: handle('b.xml'),
      saved: '<b/>',
      modified: 2,
    })
    diskStore.setState(() => ({}))

    await loadDiskLinks(new Set(['a']))
    expect(diskStore.state).toEqual({
      a: { handle: handle('a.xml'), saved: '<a/>', modified: 1 },
    })

    await loadDiskLinks(new Set(['a', 'b']))
    expect(Object.keys(diskStore.state)).toEqual(['a'])
  })
})
