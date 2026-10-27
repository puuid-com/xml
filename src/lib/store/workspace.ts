import { loadDiskLinks } from './disk'
import { filesCollection } from './files'
import { workspaceReady as collectionsReady } from './persist'
// Each collection registers itself when its module loads, so load them all
// before waiting on them.
import './defaults'
import './highlights'
import './pins'
import './profiles'
import './variables'

/** Resolves once the stored files, settings and links to disk are loaded. */
export async function workspaceReady() {
  await collectionsReady()
  await loadDiskLinks(new Set(filesCollection.keys()))
}
