import { IconCopy } from '@tabler/icons-react'

import { notify } from '#/components/app/notice-store'
import { editorStore } from '#/components/editor/editor-store'
import { ContextMenuItem } from '#/components/ui/context-menu'
import { formatPath, pathFormats } from '#/lib/paths'
import { m } from '#/paraglide/messages'
import type { PathFormat } from '#/lib/paths'
import type { XmlElement } from '#/lib/xml/model'

const LABELS: Record<PathFormat, () => string> = {
  xpath: m.node_copy_xpath,
  jsonpath: m.node_copy_jsonpath,
  'json-pointer': m.node_copy_json_pointer,
}

/** Copies the element's path in each standard format for its language. */
export function CopyPathMenuItems({ el }: { el: XmlElement }) {
  return pathFormats(el).map((format) => (
    <ContextMenuItem
      key={format}
      onSelect={() => {
        const path = formatPath(editorStore.state.doc.nodes, el, format)
        void navigator.clipboard.writeText(path)
        notify.success(m.copied(), { detail: path })
      }}
    >
      <IconCopy />
      {LABELS[format]()}
    </ContextMenuItem>
  ))
}
