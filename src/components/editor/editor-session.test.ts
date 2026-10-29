import { history, redo, undo, undoDepth } from '@codemirror/commands'
import { EditorView } from '@codemirror/view'
import {
  createCollection,
  createIndexedDB,
  indexedDBCollectionOptions,
} from '@tanstack/react-db'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  createEditorSession,
  dropEditorState,
  remoteSync,
} from './editor-session'
import { docLanguage } from './language'
import { createBackup, restoreBackup } from '#/lib/store/backup'
import {
  createFile,
  fileSchema,
  filesCollection,
  renameFile,
} from '#/lib/store/files'
import { settleWrites } from '#/lib/store/persist'
import { workspaceReady } from '#/lib/store/workspace'

beforeAll(() => workspaceReady())

const dispose: Array<() => void> = []

afterEach(async () => {
  vi.restoreAllMocks()
  dispose.splice(0).forEach((stop) => stop())
  for (const id of filesCollection.keys()) dropEditorState(id)
  const ids = [...filesCollection.keys()]
  if (ids.length) await filesCollection.delete(ids).isPersisted.promise
  await settleWrites()
})

async function open() {
  const file = createFile('a.xml', '<a/>')
  await settleWrites()
  const view = new EditorView({ parent: document.body })
  const onLocalChange = vi.fn()
  const onRemoteChange = vi.fn()
  const onLanguageChange = vi.fn()
  const session = createEditorSession(view, {
    onRemoteChange,
    onLanguageChange,
  })
  const extensions = [
    history(),
    EditorView.updateListener.of((update) => {
      if (
        update.docChanged &&
        !update.transactions.some((tr) => tr.annotation(remoteSync))
      ) {
        onLocalChange(update.state.doc.toString())
      }
    }),
  ]
  session.open(file.id, extensions)
  dispose.push(() => {
    session.dispose()
    view.destroy()
  })
  return {
    file,
    view,
    session,
    extensions,
    onLocalChange,
    onRemoteChange,
    onLanguageChange,
  }
}

describe('editor session', () => {
  it('applies the first edit from another connection without echoing it or adding undo history', async () => {
    const { file, view, onLocalChange, onRemoteChange } = await open()
    const db = await createIndexedDB({
      name: 'xml-editor',
      version: 1,
      stores: ['files'],
    })
    const other = createCollection(
      indexedDBCollectionOptions({
        db,
        name: 'files',
        id: 'other-tab-files',
        schema: fileSchema,
        getKey: (row) => row.id,
      }),
    )
    try {
      await other.preload()
      await other.update(file.id, (draft) => {
        draft.content = '<a>remote</a>'
        draft.writer = 'other-tab'
      }).isPersisted.promise
      await vi.waitFor(() =>
        expect(view.state.doc.toString()).toBe('<a>remote</a>'),
      )
      expect(onRemoteChange).toHaveBeenCalledTimes(1)
      expect(onLocalChange).not.toHaveBeenCalled()
      expect(undoDepth(view.state)).toBe(0)
    } finally {
      await other.cleanup()
      db.close()
    }
  })

  it('preserves undo history across switches and catches up a cached file', async () => {
    const { file, view, session, extensions, onRemoteChange } = await open()
    view.dispatch({ changes: { from: 2, insert: ' ' } })
    await filesCollection.update(file.id, (draft) => {
      draft.content = view.state.doc.toString()
    }).isPersisted.promise
    const other = createFile('b.xml', '<b/>')
    await settleWrites()
    session.open(other.id, extensions)
    session.open(file.id, extensions)
    expect(view.state.doc.toString()).toBe('<a />')
    expect(undoDepth(view.state)).toBe(1)
    expect(undo(view)).toBe(true)
    expect(view.state.doc.toString()).toBe('<a/>')

    session.open(other.id, extensions)
    await filesCollection.update(file.id, (draft) => {
      draft.content = '<remote/>'
      draft.writer = 'other-tab'
    }).isPersisted.promise
    expect(view.state.doc.toString()).toBe('<b/>')
    expect(onRemoteChange).not.toHaveBeenCalled()
    session.open(file.id, extensions)
    expect(view.state.doc.toString()).toBe('<remote/>')
  })

  it('reconfigures the language when a file is renamed', async () => {
    const { file, view, onLanguageChange } = await open()
    await renameFile(file.id, 'a.json')!.isPersisted.promise
    expect(view.state.facet(docLanguage)).toBe('json')
    expect(onLanguageChange).toHaveBeenCalledWith(file.id)
  })

  it('restores the open editor text when the final backup write fails', async () => {
    const { file, view, onLocalChange } = await open()
    const backup = createBackup(new Map([[file.id, '<backup/>']]))
    const put = IDBObjectStore.prototype.put
    let refused = false
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      ...args
    ) {
      if (this.name === 'files' && !refused) {
        refused = true
        throw new DOMException('Full', 'QuotaExceededError')
      }
      return put.apply(this, args)
    })
    await expect(restoreBackup(backup)).rejects.toThrow('Full')
    expect(view.state.doc.toString()).toBe('<a/>')
    expect(filesCollection.get(file.id)?.content).toBe('<a/>')
    expect(onLocalChange).not.toHaveBeenCalled()
  })

  it('restores a backup as an undoable edit of the open and other files', async () => {
    const { file, view, session, extensions, onLocalChange, onRemoteChange } =
      await open()
    const other = createFile('b.xml', '<b/>')
    await settleWrites()
    const backup = createBackup(
      new Map([
        [file.id, '<a>backup</a>'],
        [other.id, '<b>backup</b>'],
      ]),
    )
    await restoreBackup(backup)
    expect(view.state.doc.toString()).toBe('<a>backup</a>')
    expect(onRemoteChange).not.toHaveBeenCalled()
    expect(onLocalChange).not.toHaveBeenCalled()
    expect(undo(view)).toBe(true)
    expect(view.state.doc.toString()).toBe('<a/>')
    expect(onLocalChange).toHaveBeenLastCalledWith('<a/>')
    expect(redo(view)).toBe(true)
    expect(view.state.doc.toString()).toBe('<a>backup</a>')

    // Never opened in this editor, yet its restore can be undone too.
    session.open(other.id, extensions)
    expect(view.state.doc.toString()).toBe('<b>backup</b>')
    expect(undo(view)).toBe(true)
    expect(view.state.doc.toString()).toBe('<b/>')
  })
})
