import { setFileType } from './file-type'
import { setPasteChoice } from './ui-store'
import {
  detectLanguage,
  languageOf,
  typedName,
  untypedName,
} from '#/lib/document'
import { filesCollection, setFileProfile } from '#/lib/store/files'
import { learnSample, profileGuesser } from '#/lib/store/profiles'
import type { PasteChoice } from './ui-store'

/**
 * Asks which type and profile content pasted into an empty file has, with
 * whatever the content gives away already picked.
 */
export function askPasteChoice(fileId: string, text: string) {
  const file = filesCollection.get(fileId)
  if (!file) return
  const detected = detectLanguage(text)
  const language = detected ?? languageOf(untypedName(file.name), text)
  const guessed = profileGuesser(fileId)(typedName(file.name, language), text)
  setPasteChoice({
    fileId,
    language,
    profileId: guessed ?? file.profileId,
    detected: { language: detected !== null, profileId: guessed },
  })
}

/** Gives the file the extension of its type and moves it to the profile. */
export async function applyPasteChoice({
  fileId,
  language,
  profileId,
}: Pick<PasteChoice, 'fileId' | 'language' | 'profileId'>) {
  const file = filesCollection.get(fileId)
  if (!file) return
  await setFileType(fileId, language)
  await setFileProfile(fileId, profileId)
  const typed = filesCollection.get(fileId)
  learnSample(profileId, typed?.name ?? '', typed?.content ?? '')
}
