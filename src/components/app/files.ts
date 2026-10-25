import { toast } from 'sonner'

import { createFile } from '#/lib/store/files'
import { setActive } from '#/lib/store/session'
import { m } from '#/paraglide/messages'

export const NEW_FILE_CONTENT =
  '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  \n</root>\n'

export const NEW_JSON_CONTENT = '{\n  \n}\n'

export const ACCEPTED_TYPES =
  '.xml,.xsd,.xsl,.xslt,.wsdl,.svg,.plist,.config,.csproj,.xaml,.rss,.atom,.kml,.gpx,text/xml,application/xml,.json,.geojson,.jsonld,.webmanifest,.har,application/json'

/** The tab to show after closing the one at `index`: next, else previous. */
export function neighbour<T>(list: ReadonlyArray<T>, index: number) {
  return list.at(index + 1) ?? (index > 0 ? list.at(index - 1) : undefined)
}

export function newFile() {
  const file = createFile(m.file_untitled(), NEW_FILE_CONTENT)
  setActive(file.id)
}

export function newJsonFile() {
  const file = createFile(m.file_untitled_json(), NEW_JSON_CONTENT)
  setActive(file.id)
}

/** Reads dropped or picked files and opens each in a tab. */
export async function importFiles(list: FileList | Array<File>) {
  let last: string | null = null
  for (const file of Array.from(list)) {
    try {
      const created = createFile(file.name, await file.text())
      last = created.id
    } catch (error) {
      toast.error(m.file_import_failed({ name: file.name }), {
        duration: 4000,
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }
  if (last) setActive(last)
}
