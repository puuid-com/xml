// Each collection registers itself when its module loads, so load them all
// before waiting on them.
import './defaults'
import './files'
import './highlights'
import './pins'
import './profiles'
import './variables'

export { workspaceReady } from './persist'
