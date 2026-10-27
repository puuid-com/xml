import { createFileRoute } from '@tanstack/react-router'

import { EditorApp } from '#/components/app/EditorApp'
import { seo } from '#/lib/seo'

export const Route = createFileRoute('/')({
  // The editor lives entirely in the browser (CodeMirror, local cache).
  ssr: false,
  // Stored files and settings load from IndexedDB before the editor shows.
  loader: () =>
    import('#/lib/store/workspace').then((mod) => mod.workspaceReady()),
  head: () => seo({ path: '/' }),
  component: EditorApp,
})
