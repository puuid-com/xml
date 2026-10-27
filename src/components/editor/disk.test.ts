import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { saveToDisk } from './disk'
import { noticeStore } from '#/components/app/notice-store'
import { diskStore } from '#/lib/store/disk'
import { createFile } from '#/lib/store/files'
import { workspaceReady } from '#/lib/store/workspace'

beforeAll(() => workspaceReady())

afterEach(() => {
  diskStore.setState(() => ({}))
  vi.restoreAllMocks()
})

/** A file on disk, as a handle sees it. */
function fakeHandle(name: string, modified: number) {
  const disk = { text: '', modified }
  const handle = {
    kind: 'file',
    name,
    queryPermission: vi.fn(() => Promise.resolve('granted')),
    requestPermission: vi.fn(() => Promise.resolve('granted')),
    getFile: () =>
      Promise.resolve({ lastModified: disk.modified, text: () => disk.text }),
    createWritable: () => {
      let text = ''
      return Promise.resolve({
        write: (chunk: string) => {
          text += chunk
          return Promise.resolve()
        },
        close: () => {
          disk.text = text
          disk.modified += 1
          return Promise.resolve()
        },
      })
    },
  }
  return { disk, handle: handle as unknown as FileSystemFileHandle }
}

describe('saving to disk', () => {
  // Fake handles can't be cloned into IndexedDB; the link still works.
  const quiet = () => vi.spyOn(console, 'error').mockImplementation(() => {})

  it('writes the tab to its file and remembers what was saved', async () => {
    quiet()
    const file = createFile('a.xml', '<a>new</a>')
    const { disk, handle } = fakeHandle('a.xml', 5)
    diskStore.setState(() => ({
      [file.id]: { handle, saved: '<a/>', modified: 5 },
    }))
    await saveToDisk(file.id)
    expect(disk.text).toBe('<a>new</a>')
    expect(diskStore.state[file.id]).toMatchObject({
      saved: '<a>new</a>',
      modified: 6,
    })
    expect(noticeStore.state?.message).toBe('Saved to a.xml')
  })

  it('asks before overwriting a file changed elsewhere', async () => {
    quiet()
    const file = createFile('b.xml', '<b>mine</b>')
    const { disk, handle } = fakeHandle('b.xml', 9)
    diskStore.setState(() => ({
      [file.id]: { handle, saved: '<b/>', modified: 5 },
    }))
    await saveToDisk(file.id)
    expect(disk.text).toBe('')
    const notice = noticeStore.state
    expect(notice).toMatchObject({
      tone: 'error',
      message: 'b.xml changed on disk since it was opened here',
    })

    notice?.action?.run()
    await vi.waitFor(() => expect(disk.text).toBe('<b>mine</b>'))
  })

  it("doesn't write without permission", async () => {
    const file = createFile('c.xml', '<c/>')
    const { disk, handle } = fakeHandle('c.xml', 1)
    vi.mocked(handle.queryPermission).mockResolvedValue('prompt')
    vi.mocked(handle.requestPermission).mockResolvedValue('denied')
    diskStore.setState(() => ({
      [file.id]: { handle, saved: '', modified: 1 },
    }))
    await saveToDisk(file.id)
    expect(disk.text).toBe('')
    expect(noticeStore.state?.message).toBe(
      'Not saved: no permission to write to c.xml',
    )
  })
})
