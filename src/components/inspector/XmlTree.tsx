import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronRight,
} from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useDraft } from './use-draft'
import { VarText } from './VarText'
import {
  editAtPath,
  editorStore,
  revealElement,
  revealRange,
} from '#/components/editor/editor-store'
import { ColorSwatches } from '#/components/highlights/ColorSwatches'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '#/components/ui/context-menu'
import { useHighlightMap } from '#/hooks/use-highlights'
import {
  findHighlight,
  removeHighlight,
  setHighlight,
} from '#/lib/store/highlights'
import {
  sessionStore,
  setCollapsed,
  toggleCollapsed,
} from '#/lib/store/session'
import { cn } from '#/lib/utils'
import { addChild, removeNode, setText } from '#/lib/xml/edit'
import {
  allElements,
  ancestorPaths,
  displayPath,
  flattenVisible,
} from '#/lib/xml/locate'
import { isLeaf, leafValue } from '#/lib/xml/model'
import { m } from '#/paraglide/messages'
import type { TreeRow } from '#/lib/xml/locate'

const ROW_HEIGHT = 26
const INDENT = 14
const NO_COLLAPSED: Array<string> = []

export function XmlTree() {
  const fileId = useSelector(editorStore, (s) => s.fileId)
  const doc = useSelector(editorStore, (s) => s.doc)
  const selectedPath = useSelector(editorStore, (s) => s.selectedPath)
  const collapsedList = useSelector(sessionStore, (s) =>
    fileId ? (s.collapsed[fileId] ?? NO_COLLAPSED) : NO_COLLAPSED,
  )
  const highlights = useHighlightMap()
  const scrollRef = useRef<HTMLDivElement>(null)

  const collapsed = new Set(collapsedList)
  const rows = flattenVisible(doc.nodes, collapsed)

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 16,
  })

  // Follow the editor cursor: expand collapsed ancestors and scroll to it.
  useEffect(() => {
    if (!selectedPath || !fileId) return
    const hidden = ancestorPaths(selectedPath).filter((p) => collapsed.has(p))
    if (hidden.length > 0) {
      setCollapsed(
        fileId,
        collapsedList.filter((p) => !hidden.includes(p)),
      )
      return
    }
    const index = rows.findIndex((r) => r.el.path === selectedPath)
    if (index >= 0) virtualizer.scrollToIndex(index, { align: 'auto' })
  }, [selectedPath, fileId, rows.length])

  if (!fileId) return null

  return (
    <div className="flex h-full min-h-0 flex-col">
      {doc.errors.length > 0 && (
        <div className="border-b bg-destructive/5 px-3 py-2 text-xs">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-destructive">
            <IconAlertTriangle className="size-3.5" />
            {m.tree_errors({ count: doc.errors.length })}
          </div>
          <ul className="space-y-0.5">
            {doc.errors.slice(0, 3).map((error) => (
              <li key={`${error.from}-${error.message}`}>
                <button
                  type="button"
                  className="w-full truncate text-left text-muted-foreground hover:text-foreground"
                  onClick={() => revealRange(error.from, error.to)}
                >
                  {error.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {rows.length === 0 ? (
        <p className="p-4 text-xs text-muted-foreground">{m.tree_empty()}</p>
      ) : (
        <div
          ref={scrollRef}
          role="tree"
          aria-label={m.tree_label()}
          className="min-h-0 flex-1 overflow-auto py-1"
        >
          <div
            className="relative w-full"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((item) => {
              const row = rows[item.index]
              return (
                <TreeRowView
                  key={row.el.path}
                  row={row}
                  fileId={fileId}
                  top={item.start}
                  selected={row.el.path === selectedPath}
                  color={highlights.get(row.el.name)}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function TreeRowView({
  row,
  fileId,
  top,
  selected,
  color,
}: {
  row: TreeRow
  fileId: string
  top: number
  selected: boolean
  color: string | undefined
}) {
  const { el, depth, hasChildren, collapsed } = row
  const leaf = isLeaf(el)
  const rule = findHighlight(el.name)

  const collapseChildren = (collapse: boolean) => {
    const paths = allElements([el])
      .filter((e) => e !== el && !isLeaf(e))
      .map((e) => e.path)
    const current = new Set(sessionStore.state.collapsed[fileId] ?? [])
    for (const p of paths) {
      if (collapse) current.add(p)
      else current.delete(p)
    }
    if (!collapse) current.delete(el.path)
    setCollapsed(fileId, [...current])
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="treeitem"
          aria-level={depth + 1}
          aria-selected={selected}
          aria-expanded={hasChildren ? !collapsed : undefined}
          onClick={() => revealElement(el)}
          className={cn(
            'group absolute left-0 flex w-full cursor-default items-center gap-1 pr-2 font-mono text-xs select-none hover:bg-muted/60',
            selected && 'bg-muted',
          )}
          style={{
            top,
            height: ROW_HEIGHT,
            paddingLeft: 6 + depth * INDENT,
            boxShadow: color ? `inset 2px 0 0 ${color}` : undefined,
            backgroundColor:
              color && !selected
                ? `color-mix(in oklch, ${color} 6%, transparent)`
                : undefined,
          }}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-label={collapsed ? m.tree_expand() : m.tree_collapse()}
              className="grid size-4 shrink-0 place-items-center text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                toggleCollapsed(fileId, el.path)
              }}
            >
              {collapsed ? (
                <IconChevronRight className="size-3" />
              ) : (
                <IconChevronDown className="size-3" />
              )}
            </button>
          ) : (
            <span className="size-4 shrink-0" />
          )}
          <span
            className={cn('shrink-0 font-medium', !color && 'text-syntax-tag')}
            style={color ? { color } : undefined}
          >
            {el.name}
          </span>
          {el.attrs.slice(0, 3).map((attr) => (
            <span
              key={attr.name}
              className="flex min-w-0 shrink items-center truncate"
            >
              <span className="text-syntax-attr">{attr.name}</span>
              <span className="text-syntax-punct">=</span>
              <VarText
                text={attr.value}
                className="max-w-32 text-syntax-value"
              />
            </span>
          ))}
          {el.attrs.length > 3 && (
            <span className="shrink-0 text-muted-foreground">
              +{el.attrs.length - 3}
            </span>
          )}
          {leaf && !el.selfClosing && (
            <LeafValue path={el.path} value={leafValue(el)} />
          )}
          {leaf && el.selfClosing && <span className="flex-1" />}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            {m.highlight_tag({ name: el.name })}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="p-2">
            <ColorSwatches
              value={rule?.color}
              onSelect={(c) => setHighlight(el.name, c)}
            />
          </ContextMenuSubContent>
        </ContextMenuSub>
        {rule && (
          <ContextMenuItem onSelect={() => removeHighlight(rule.id)}>
            {m.highlight_remove()}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() =>
            editAtPath(el.path, (fresh, text) =>
              addChild(text, fresh, 'element'),
            )
          }
        >
          {m.node_add_child()}
        </ContextMenuItem>
        {hasChildren && (
          <>
            <ContextMenuItem onSelect={() => collapseChildren(true)}>
              {m.tree_collapse_all()}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => collapseChildren(false)}>
              {m.tree_expand_all()}
            </ContextMenuItem>
          </>
        )}
        <ContextMenuItem
          onSelect={() => {
            void navigator.clipboard.writeText(displayPath(el.path).join('/'))
            toast.success(m.copied())
          }}
        >
          {m.node_copy_path()}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onSelect={() =>
            editAtPath(el.path, (fresh, text) => removeNode(text, fresh))
          }
        >
          {m.node_delete()}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

/** Leaf text shown inline; click to edit in place. */
function LeafValue({ path, value }: { path: string; value: string }) {
  const [editing, setEditing] = useState(false)
  const draft = useDraft(value, (next) =>
    editAtPath(path, (el) => setText(el, next)),
  )

  if (editing) {
    return (
      <input
        autoFocus
        aria-label={m.node_text()}
        className="ml-1 h-5 min-w-0 flex-1 border border-ring bg-background px-1 font-mono text-xs outline-none"
        {...draft}
        onClick={(e) => e.stopPropagation()}
        onBlur={() => {
          draft.onBlur()
          setEditing(false)
        }}
        onKeyDown={(e) => {
          draft.onKeyDown(e)
          if (e.key === 'Enter') setEditing(false)
        }}
      />
    )
  }
  return (
    <button
      type="button"
      title={m.node_edit_text()}
      className="ml-1 flex h-5 min-w-0 flex-1 items-center truncate px-1 text-left text-foreground/80 hover:bg-background hover:ring-1 hover:ring-border"
      onClick={(e) => {
        e.stopPropagation()
        setEditing(true)
      }}
    >
      {value.trim() === '' ? (
        <span className="text-muted-foreground/60 italic">
          {m.node_empty()}
        </span>
      ) : (
        <VarText text={value.trim()} />
      )}
    </button>
  )
}
