import {
  IconAlertCircle,
  IconCircleCheck,
  IconDatabase,
} from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'

import {
  editorStore,
  getText,
  revealRange,
} from '#/components/editor/editor-store'
import { cacheSize } from '#/lib/store/files'
import { allElements, displayPath } from '#/lib/xml/locate'
import { findVars } from '#/lib/xml/vars'
import { m } from '#/paraglide/messages'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function StatusBar() {
  const fileId = useSelector(editorStore, (s) => s.fileId)
  const doc = useSelector(editorStore, (s) => s.doc)
  const line = useSelector(editorStore, (s) => s.line)
  const col = useSelector(editorStore, (s) => s.col)
  const selectedPath = useSelector(editorStore, (s) => s.selectedPath)
  // Re-read on each parse; cheap compared to the parse itself.
  useSelector(editorStore, (s) => s.revision)

  const varCount = fileId ? findVars(getText()).length : 0
  const elementCount = allElements(doc.nodes).length
  const first = doc.errors.at(0)

  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t px-3 text-[11px] text-muted-foreground">
      {fileId && (
        <>
          {first ? (
            <button
              type="button"
              className="flex items-center gap-1 text-destructive hover:underline"
              onClick={() => revealRange(first.from, first.to)}
            >
              <IconAlertCircle className="size-3.5" />
              {m.status_errors({ count: doc.errors.length })}
            </button>
          ) : (
            <span className="flex items-center gap-1 text-syntax-value">
              <IconCircleCheck className="size-3.5" />
              {m.status_valid()}
            </span>
          )}
          <span className="tabular-nums">
            {m.status_position({ line, col })}
          </span>
          {selectedPath && (
            <span className="hidden min-w-0 truncate font-mono md:inline">
              {displayPath(selectedPath).join(' › ')}
            </span>
          )}
        </>
      )}
      <div className="flex-1" />
      {fileId && (
        <>
          <span className="hidden sm:inline">
            {m.status_elements({ count: elementCount })}
          </span>
          {varCount > 0 && (
            <span className="text-syntax-var">
              {m.status_vars({ count: varCount })}
            </span>
          )}
        </>
      )}
      <span className="flex items-center gap-1" title={m.status_cache_hint()}>
        <IconDatabase className="size-3.5" />
        {formatBytes(cacheSize())}
      </span>
    </footer>
  )
}
