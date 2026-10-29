import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { saveToDisk } from './disk'
import { downloadFile } from './actions'
import { editorStore } from './editor-store'
import { noticeStore } from '#/components/app/notice-store'
import { diskStore } from '#/lib/store/disk'
import { createFile, filesCollection } from '#/lib/store/files'
import { workspaceReady } from '#/lib/store/workspace'

beforeAll(() => workspaceReady())

afterEach(() => {
  diskStore.setState(() => ({}))
  editorStore.setState((state) => ({ ...state, fileId: null }))
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** A file on disk, as a handle sees it. */
function fakeHandle(name: string, modified: number) {
  const disk = { text: '', modified }
  let pendingText = ''
  const stream = {
    write: vi.fn((text: string) => {
      pendingText = text
      return Promise.resolve()
    }),
    close: vi.fn(() => {
      disk.text = pendingText
      disk.modified += 1
      return Promise.resolve()
    }),
    abort: vi.fn(() => Promise.resolve()),
  }
  const handle = {
    kind: 'file',
    name,
    queryPermission: vi.fn(() => Promise.resolve('granted')),
    requestPermission: vi.fn(() => Promise.resolve('granted')),
    getFile: () =>
      Promise.resolve({ lastModified: disk.modified, text: () => disk.text }),
    createWritable: vi.fn(() => Promise.resolve(stream)),
  }
  return { disk, stream, handle: handle as unknown as FileSystemFileHandle }
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

  it('uses the stored content after the active editor unmounts', async () => {
    quiet()
    const file = createFile('unmounted.xml', '<keep/>')
    const { disk, handle } = fakeHandle('unmounted.xml', 1)
    editorStore.setState((state) => ({ ...state, fileId: file.id }))
    diskStore.setState(() => ({
      [file.id]: { handle, saved: '', modified: 1 },
    }))

    await saveToDisk(file.id)

    expect(disk.text).toBe('<keep/>')
  })

  it('downloads the stored content and language after the editor unmounts', async () => {
    const file = createFile('unmounted.json', '{"keep": true}')
    editorStore.setState((state) => ({ ...state, fileId: file.id }))
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:test')
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadFile(file.id)

    expect(createObjectURL).toHaveBeenCalledOnce()
    const blob = createObjectURL.mock.calls[0][0]
    expect(blob.type).toBe('application/json')
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(blob)
    })
    expect(text).toBe(file.content)
  })

  it('does not overwrite disk when the file disappears during permission approval', async () => {
    const file = createFile('removed.xml', '<keep/>')
    const { handle } = fakeHandle('removed.xml', 1)
    let grant!: (state: PermissionState) => void
    vi.mocked(handle.queryPermission).mockReturnValue(
      new Promise<PermissionState>((resolve) => (grant = resolve)),
    )
    diskStore.setState(() => ({
      [file.id]: { handle, saved: '<keep/>', modified: 1 },
    }))

    const saving = saveToDisk(file.id)
    await filesCollection.delete(file.id).isPersisted.promise
    grant('granted')
    await saving

    expect(handle.createWritable).not.toHaveBeenCalled()
  })

  it.each(['write', 'close'] as const)(
    'aborts a failed %s and preserves the original error and saved baseline',
    async (operation) => {
      const file = createFile('failed.xml', '<new/>')
      const { disk, handle, stream } = fakeHandle('failed.xml', 1)
      const failure = new Error('Disk is full')
      stream[operation].mockRejectedValue(failure)
      stream.abort.mockRejectedValue(new Error('Already errored'))
      diskStore.setState(() => ({
        [file.id]: { handle, saved: '<old/>', modified: 1 },
      }))

      await saveToDisk(file.id)

      expect(stream.abort).toHaveBeenCalledWith(failure)
      expect(disk.text).toBe('')
      expect(diskStore.state[file.id]?.saved).toBe('<old/>')
      expect(noticeStore.state).toMatchObject({
        tone: 'error',
        detail: failure.message,
      })
    },
  )
})
