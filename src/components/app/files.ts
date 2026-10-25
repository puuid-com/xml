import { notify } from './notice-store'
import { createFile } from '#/lib/store/files'
import { activeProfileId } from '#/lib/store/profiles'
import { setActive } from '#/lib/store/session'
import { m } from '#/paraglide/messages'

const NEW_FILE_CONTENT =
  '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  \n</root>\n'

const NEW_JSON_CONTENT = '{\n  \n}\n'

export const ACCEPTED_TYPES =
  '.xml,.xsd,.xsl,.xslt,.wsdl,.svg,.plist,.config,.csproj,.xaml,.rss,.atom,.kml,.gpx,text/xml,application/xml,.json,.geojson,.jsonld,.webmanifest,.har,application/json'

/** The tab to show after closing the one at `index`: next, else previous. */
export function neighbour<T>(list: ReadonlyArray<T>, index: number) {
  return list.at(index + 1) ?? (index > 0 ? list.at(index - 1) : undefined)
}

// New files take the profile of the file in the editor.

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

/** Reads dropped or picked files and opens each in a tab. */
export async function importFiles(list: FileList | Array<File>) {
  const files = Array.from(list)
  const contents = await Promise.allSettled(files.map((file) => file.text()))
  const profileId = activeProfileId()
  let last: string | null = null
  for (const [i, result] of contents.entries()) {
    const { name } = files[i]
    if (result.status === 'fulfilled') {
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
