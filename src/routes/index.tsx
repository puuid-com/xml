import { createFileRoute } from '@tanstack/react-router'

import { EditorApp } from '#/components/app/EditorApp'
import { seo } from '#/lib/seo'

export const Route = createFileRoute('/')({
  // The editor lives entirely in the browser (CodeMirror, local cache).
  ssr: false,
  head: () => seo({ path: '/' }),
  component: EditorApp,
})
