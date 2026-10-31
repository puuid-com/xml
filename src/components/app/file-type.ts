import { useFileContent } from '#/hooks/use-files'
import { languageOf, typedName } from '#/lib/document'
import { filesCollection, renameFile, uniqueName } from '#/lib/store/files'
import { isFlatFile } from '#/lib/flat/parse'
import { m } from '#/paraglide/messages'
import type { DocLanguage } from '#/lib/document'

export const FILE_TYPES: Array<{ value: DocLanguage; label: () => string }> = [
  { value: 'xml', label: m.paste_type_xml },
  { value: 'json', label: m.paste_type_json },
  { value: 'flat', label: m.paste_type_flat },
]

/**
 * Whether a file can be read as `language`. Fixed-width records read as such
 * whatever the name says, and nothing else does.
 */
export function canReadAs(content: string, language: DocLanguage) {
  return isFlatFile(content) === (language === 'flat')
}

/** A file's current type and the content that limits what it can become. */
export function useFileType(id: string) {
  const file = useFileContent(id)
  if (!file) return null
  return {
    language: languageOf(file.name, file.content),
    content: file.content,
  }
}

/** Gives the file the extension of `language`, so it is read as that type. */
export async function setFileType(id: string, language: DocLanguage) {
  const file = filesCollection.get(id)
  if (!file) return
  const name = typedName(file.name, language)
  if (name !== file.name)
    await renameFile(id, uniqueName(name))?.isPersisted.promise
}
