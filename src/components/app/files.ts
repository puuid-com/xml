import { notify } from './notice-store'
import { setDiskLink } from '#/lib/store/disk'
import { createFile } from '#/lib/store/files'
import { activeProfileId, profileGuesser } from '#/lib/store/profiles'
import { setActive } from '#/lib/store/session'
import { m } from '#/paraglide/messages'

const NEW_FILE_CONTENT =
  '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  \n</root>\n'

const NEW_JSON_CONTENT = '{\n  \n}\n'

const XML_EXTENSIONS = [
  '.xml',
  '.xsd',
  '.xsl',
  '.xslt',
  '.wsdl',
  '.svg',
  '.plist',
  '.config',
  '.csproj',
  '.xaml',
  '.rss',
  '.atom',
  '.kml',
  '.gpx',
] as const
const JSON_EXTENSIONS = [
  '.json',
  '.geojson',
  '.jsonld',
  '.webmanifest',
  '.har',
] as const

export const ACCEPTED_TYPES = [
  ...XML_EXTENSIONS,
  'text/xml',
  'application/xml',
  ...JSON_EXTENSIONS,
  'application/json',
].join(',')

/** File types for the open picker, as the File System Access API wants them. */
const PICKER_TYPES: Array<FilePickerAcceptType> = [
  {
    description: 'XML, JSON',
    accept: {
      'application/xml': [...XML_EXTENSIONS],
      'application/json': [...JSON_EXTENSIONS],
    },
  },
]

/** The tab to show once `closing` are gone: the nearest one to the right, else the left. */
export function survivor(
  openIds: ReadonlyArray<string>,
  closing: ReadonlySet<string>,
  activeId: string,
) {
  const index = openIds.indexOf(activeId)
  const after = openIds.slice(index + 1).find((id) => !closing.has(id))
  const before = openIds
    .slice(0, Math.max(index, 0))
    .reverse()
    .find((id) => !closing.has(id))
  return after ?? before
}

// New files take the profile of the file in the editor. Opened files take
// the profile whose files they are shaped like, else that one too.

export function newFile() {
  const file = createFile(
    m.file_untitled(),
    NEW_FILE_CONTENT,
    activeProfileId(),
  )
  setActive(file.id)
}

export function newJsonFile() {
  const file = createFile(
    m.file_untitled_json(),
    NEW_JSON_CONTENT,
    activeProfileId(),
  )
  setActive(file.id)
}

/** Whether the browser can open files so that they save back to disk. */
export function canOpenFromDisk() {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window
}

/**
 * Asks for files on disk and opens each in a tab linked to its file, so ⌘S
 * writes back to it. Needs `canOpenFromDisk()`.
 */
export async function pickFromDisk() {
  let handles: Array<FileSystemFileHandle>
  try {
    handles = await window.showOpenFilePicker({
      multiple: true,
      types: PICKER_TYPES,
    })
  } catch {
    // Closed without picking, or the page lost focus.
    return
  }
  await importHandles(handles)
}

/** Opens files on disk in tabs linked to them. */
export async function importHandles(
  handles: ReadonlyArray<FileSystemFileHandle>,
) {
  const fallback = activeProfileId()
  const guess = profileGuesser()
  let last: string | null = null
  for (const handle of handles) {
    try {
      // One at a time, so the tabs keep the picked order.
      // react-doctor-disable-next-line react-doctor/async-await-in-loop
      const file = await handle.getFile()
      // react-doctor-disable-next-line react-doctor/async-await-in-loop
      const text = await file.text()
      const profileId = guess(file.name, text) ?? fallback
      last = createFile(file.name, text, profileId).id
      void setDiskLink(last, {
        handle,
        saved: text,
        modified: file.lastModified,
      })
    } catch (error) {
      notify.error(m.file_import_failed({ name: handle.name }), {
        detail: error instanceof Error ? error.message : undefined,
      })
    }
  }
  if (last) setActive(last)
}

/**
 * Opens dropped files. Browsers that give handles for them link the tabs to
 * the files, as when picked.
 */
export function dropFiles(data: DataTransfer) {
  const items = [...data.items].filter((item) => item.kind === 'file')
  if (
    !items.length ||
    !('getAsFileSystemHandle' in DataTransferItem.prototype)
  ) {
    void importFiles(data.files)
    return
  }
  // Handles have to be asked for before the drop event ends.
  const pending = items.map((item) => item.getAsFileSystemHandle())
  const files = [...data.files]
  void Promise.all(pending).then(
    (handles) => {
      const fileHandles = handles.filter(
        (handle): handle is FileSystemFileHandle => handle?.kind === 'file',
      )
      if (fileHandles.length === handles.length) void importHandles(fileHandles)
      else void importFiles(files)
    },
    () => void importFiles(files),
  )
}

/** Reads dropped or picked files and opens each in a tab. */
export async function importFiles(list: FileList | Array<File>) {
  const files = Array.from(list)
  const contents = await Promise.allSettled(files.map((file) => file.text()))
  const fallback = activeProfileId()
  const guess = profileGuesser()
  let last: string | null = null
  for (const [i, result] of contents.entries()) {
    const { name } = files[i]
    if (result.status === 'fulfilled') {
      const profileId = guess(name, result.value) ?? fallback
      last = createFile(name, result.value, profileId).id
      continue
    }
    notify.error(m.file_import_failed({ name }), {
      detail:
        result.reason instanceof Error ? result.reason.message : undefined,
    })
  }
  if (last) setActive(last)
}
