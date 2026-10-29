// Named JSON import: Vite bundles only this field, not the whole package.json.
import { version } from '../../package.json'

/** The app's semver, bumped in package.json with every change (see CHANGELOG.md). */
export const appVersion: string = version
