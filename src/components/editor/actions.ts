import { toast } from 'sonner'

import { getView } from './editor-store'
import { filesCollection } from '#/lib/store/files'
import { diffChange } from '#/lib/xml/edit'
import { formatXml, minifyXml } from '#/lib/xml/format'
import { m } from '#/paraglide/messages'
import type { FormatResult } from '#/lib/xml/format'

function replaceDoc(next: string, userEvent: string) {
  const view = getView()
  if (!view) return
  const change = diffChange(view.state.doc.toString(), next)
  if (change) view.dispatch({ changes: change, userEvent })
}

function applyFormat(result: FormatResult, userEvent: string) {
  if (!result.ok) {
    toast.error(m.format_failed(), {
      description: result.errors[0]?.message,
    })
    return
  }
  replaceDoc(result.text, userEvent)
}

export function formatActive() {
  const view = getView()
  if (view) applyFormat(formatXml(view.state.doc.toString()), 'input.format')
  return true
}

export function minifyActive() {
  const view = getView()
  if (view) applyFormat(minifyXml(view.state.doc.toString()), 'input.minify')
  return true
}

export function downloadFile(id: string) {
  const file = filesCollection.get(id)
  if (!file) return
  const view = getView()
  const content = view ? view.state.doc.toString() : file.content
  const blob = new Blob([content], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = /\.\w+$/.test(file.name) ? file.name : `${file.name}.xml`
  link.click()
  URL.revokeObjectURL(url)
}

export async function copyActive() {
  const view = getView()
  if (!view) return
  await navigator.clipboard.writeText(view.state.doc.toString())
  toast.success(m.copied())
}
