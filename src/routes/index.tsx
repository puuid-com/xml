import { createFileRoute } from '@tanstack/react-router'

import { EditorApp } from '#/components/app/EditorApp'
import { seo } from '#/lib/seo'

export const Route = createFileRoute('/')({
  head: () => seo({ path: '/' }),
  // The editor lives entirely in the browser (CodeMirror, local cache).
  ssr: false,
  component: EditorApp,
})
