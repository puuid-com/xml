import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronRight,
  IconPin,
} from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { toast } from 'sonner'

import { treeKeyAction } from './tree-keys'
import { useDraft } from './use-draft'
import { useScrollSync } from './use-scroll-sync'
import { VarText } from './VarText'
import {
  editAtPath,
  editorStore,
  revealElement,
  revealRange,
} from '#/components/editor/editor-store'
import { hlStyle } from '#/components/highlights/hl-style'
import {
  HighlightMenuItems,
  PinMenuItem,
} from '#/components/highlights/TagMenuItems'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '#/components/ui/context-menu'
import { useEnabledDefaults } from '#/hooks/use-defaults'
import { useHighlightMap } from '#/hooks/use-highlights'
import { usePins } from '#/hooks/use-pins'
import {
  sessionStore,
  setCollapsed,
  toggleCollapsed,
} from '#/lib/store/session'
import {
  addChildTo,
  canAddChild,
  removeElement,
  setValue,
} from '#/lib/document'
import { cn } from '#/lib/utils'
import {
  attrDiffers,
  defaultIndex,
  isDefaultAttr,
  isDefaultLeaf,
  leafDiffers,
} from '#/lib/xml/defaults'
import {
  allElements,
  ancestorPaths,
  displayPath,
  flattenVisible,
} from '#/lib/xml/locate'
import { hasName, isLeaf, isTextLeaf, leafValue } from '#/lib/xml/model'
import { m } from '#/paraglide/messages'
import type { DefaultIndex } from '#/lib/xml/defaults'
import type { TreeRow } from '#/lib/xml/locate'
import type { XmlElement } from '#/lib/xml/model'

const ROW_HEIGHT = 26
const INDENT = 14
/** Attributes shown inline; the rest are counted. */
const MAX_ATTRS = 3
const NO_COLLAPSED: Array<string> = []

export function XmlTree() {
  const fileId = useSelector(editorStore, (s) => s.fileId)
  const doc = useSelector(editorStore, (s) => s.doc)
  const selectedPath = useSelector(editorStore, (s) => s.selectedPath)
  const collapsedList = useSelector(sessionStore, (s) =>
    fileId ? (s.collapsed[fileId] ?? NO_COLLAPSED) : NO_COLLAPSED,
  )
  const highlights = useHighlightMap()
  const pins = usePins()
  const pinned = new Set(pins.map((p) => p.tag))
  const enabledDefaults = useEnabledDefaults()
  const defaults = useMemo(
    () => defaultIndex(enabledDefaults),
    [enabledDefaults],
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  // The row holding keyboard focus while focus is inside the tree.
  const [focusedPath, setFocusedPath] = useState<string | null>(null)

  const collapsed = new Set(collapsedList)
  const rows = flattenVisible(doc.nodes, collapsed)
  const indexOf = (path: string | null) =>
    path === null ? -1 : rows.findIndex((r) => r.el.path === path)
  // The single tabbable row (roving tabIndex): the focused row, else the
  // selection, else the first row.
  const focusedIndex = indexOf(focusedPath)
  const activeIndex =
    focusedIndex >= 0 ? focusedIndex : Math.max(0, indexOf(selectedPath))

  // TanStack Virtual is a known React Compiler opt-out; nothing it returns is
  // passed to a memoized child, so skipping compilation here is harmless.
  // react-doctor-disable-next-line react-hooks-js/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 16,
    // Keep the tab stop mounted even when scrolled away, so Tab still lands
    // in the tree and arrow keys can move focus from it.
    rangeExtractor: (range) => {
      const indexes = defaultRangeExtractor(range)
      if (activeIndex >= rows.length || indexes.includes(activeIndex)) {
        return indexes
      }
      return [...indexes, activeIndex].sort((a, b) => a - b)
    },
  })
  useScrollSync(scrollRef, rows, ROW_HEIGHT, fileId)

  // Follow the editor cursor: expand collapsed ancestors and scroll to it.
  // Only a cursor move triggers this, so collapsing a row by hand sticks.
  const followCursor = useEffectEvent(() => {
    if (!selectedPath || !fileId) return
    const hidden = ancestorPaths(selectedPath).filter((p) => collapsed.has(p))
    if (hidden.length > 0) {
      setCollapsed(fileId, hidden, false)
      return
    }
    const index = indexOf(selectedPath)
    if (index >= 0) virtualizer.scrollToIndex(index, { align: 'auto' })
  })
  // `rows.length` re-runs it once expanded ancestors have rendered their rows.
  useEffect(() => followCursor(), [selectedPath, fileId, rows.length])

  if (!fileId) return null

  const focusRow = (index: number) => {
    // Render first so the row is mounted and tabbable, then move focus to it.
    flushSync(() => setFocusedPath(rows[index].el.path))
    scrollRef.current
      ?.querySelector<HTMLElement>(`[role="treeitem"][data-index="${index}"]`)
      ?.focus({ preventScroll: true })
    virtualizer.scrollToIndex(index, { align: 'auto' })
  }

  const onTreeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.getAttribute('role') !== 'treeitem') return
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
    const action = treeKeyAction(rows, activeIndex, e.key)
    if (!action) return
    e.preventDefault()
    const { el } = rows[action.index]
    switch (action.type) {
      case 'focus':
        focusRow(action.index)
        break
      case 'expand':
      case 'collapse':
        toggleCollapsed(fileId, el.path)
        break
      case 'reveal':
        revealElement(el)
        break
      case 'edit':
        target.querySelector<HTMLElement>('[data-edit-value]')?.click()
        break
    }
  }

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
          onKeyDown={onTreeKeyDown}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setFocusedPath(null)
          }}
        >
          <div
            className="relative w-full"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((item) => {
              const row = rows[item.index]
              const named = hasName(row.el)
              return (
                <TreeRowView
                  key={row.el.path}
                  row={row}
                  index={item.index}
                  active={item.index === activeIndex}
                  onFocusRow={setFocusedPath}
                  fileId={fileId}
                  top={item.start}
                  defaults={defaults}
                  selected={row.el.path === selectedPath}
                  color={named ? highlights.get(row.el.name) : undefined}
                  pinned={named && pinned.has(row.el.name)}
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
  index,
  active,
  onFocusRow,
  fileId,
  top,
  defaults,
  selected,
  color,
  pinned,
}: {
  row: TreeRow
  index: number
  /** Whether this row is the tree's single Tab stop. */
  active: boolean
  onFocusRow: (path: string) => void
  fileId: string
  top: number
  defaults: DefaultIndex
  selected: boolean
  color: string | undefined
  pinned: boolean
}) {
  const { el, depth, hasChildren, collapsed } = row
  const textLeaf = isTextLeaf(el)
  const empty = hasChildren ? null : emptyContainer(el)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="treeitem"
          data-index={index}
          tabIndex={active ? 0 : -1}
          aria-level={depth + 1}
          aria-selected={selected}
          aria-expanded={hasChildren ? !collapsed : undefined}
          aria-keyshortcuts={textLeaf ? 'F2' : undefined}
          onFocus={() => onFocusRow(el.path)}
          onClick={() => revealElement(el)}
          className={cn(
            'group absolute left-0 flex w-full cursor-default items-center gap-1 pr-2 font-mono text-xs outline-none select-none hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset',
            selected && 'bg-muted',
          )}
          style={{
            top,
            height: ROW_HEIGHT,
            paddingLeft: 6 + depth * INDENT,
          }}
        >
          {hasChildren ? (
            <button
              type="button"
              tabIndex={-1}
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
          <TagLabel el={el} color={color} defaults={defaults} />
          {textLeaf && (
            <LeafValue
              path={el.path}
              value={leafValue(el)}
              defaultKey={isDefaultLeaf(defaults, el) ? el.name : undefined}
              differs={leafDiffers(defaults, el)}
            />
          )}
          {isLeaf(el) && el.selfClosing && <span className="flex-1" />}
          {empty && <span className="ml-1 text-syntax-punct">{empty}</span>}
          {pinned && (
            <IconPin
              aria-label={m.pins_title()}
              className="size-3 shrink-0 text-muted-foreground"
            />
          )}
        </div>
      </ContextMenuTrigger>
      <TreeRowMenu el={el} fileId={fileId} hasChildren={hasChildren} />
    </ContextMenu>
  )
}

/** `{}` or `[]` for an empty JSON object or array, else `null`. */
function emptyContainer(el: XmlElement) {
  if (el.json?.type === 'object') return '{}'
  if (el.json?.type === 'array') return '[]'
  return null
}

/** The tag name or key, then its first few attributes. */
function TagLabel({
  el,
  color,
  defaults,
}: {
  el: XmlElement
  color: string | undefined
  defaults: DefaultIndex
}) {
  return (
    <span
      className={cn(
        'flex min-w-0 shrink items-center gap-1',
        color && 'hl-tag mx-0.5 px-1',
      )}
      style={hlStyle(color)}
    >
      <span
        className={cn(
          'shrink-0 font-medium',
          color
            ? 'hl-ink'
            : hasName(el)
              ? 'text-syntax-tag'
              : 'text-muted-foreground',
        )}
      >
        {el.name}
      </span>
      {el.attrs.slice(0, MAX_ATTRS).map((attr) => (
        <span
          key={attr.name}
          className="flex min-w-0 shrink items-center truncate"
        >
          <span className="text-syntax-attr">{attr.name}</span>
          <span className="text-syntax-punct">=</span>
          {isDefaultAttr(defaults, attr) ? (
            <DefaultChip name={`@${attr.name}`} className="max-w-32">
              <VarText text={attr.value} />
            </DefaultChip>
          ) : (
            <VarText
              text={attr.value}
              className={cn(
                'max-w-32 text-syntax-value',
                attrDiffers(defaults, attr) &&
                  attr.value !== '' &&
                  'default-differs leading-5',
              )}
            />
          )}
        </span>
      ))}
      {el.attrs.length > MAX_ATTRS && (
        <span className="shrink-0 text-muted-foreground">
          +{el.attrs.length - MAX_ATTRS}
        </span>
      )}
    </span>
  )
}

function TreeRowMenu({
  el,
  fileId,
  hasChildren,
}: {
  el: XmlElement
  fileId: string
  hasChildren: boolean
}) {
  // Collapsing keeps this row open; expanding opens it too.
  const collapseChildren = (collapse: boolean) => {
    const descendants = allElements([el])
      .filter((e) => e !== el && !isLeaf(e))
      .map((e) => e.path)
    setCollapsed(
      fileId,
      collapse ? descendants : [el.path, ...descendants],
      collapse,
    )
  }

  return (
    <ContextMenuContent className="w-56">
      {hasName(el) && (
        <>
          <HighlightMenuItems tag={el.name} />
          {isTextLeaf(el) && <PinMenuItem tag={el.name} />}
          <ContextMenuSeparator />
        </>
      )}
      {canAddChild(el) && (
        <ContextMenuItem
          onSelect={() =>
            editAtPath(el.path, (fresh, text) =>
              addChildTo(text, fresh, el.json ? 'key' : 'element'),
            )
          }
        >
          {m.node_add_child()}
        </ContextMenuItem>
      )}
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
          editAtPath(el.path, (fresh, text, doc) =>
            removeElement(text, fresh, doc),
          )
        }
      >
        {m.node_delete()}
      </ContextMenuItem>
    </ContextMenuContent>
  )
}

/** Leaf text shown inline; click to edit in place. */
function LeafValue({
  path,
  value,
  defaultKey,
  differs,
}: {
  path: string
  value: string
  /** Set when the value equals the default for this key. */
  defaultKey?: string
  /** Whether the value differs from the default for this key. */
  differs: boolean
}) {
  const [editing, setEditing] = useState(false)
  const draft = useDraft(value, (next) =>
    editAtPath(path, (el) => setValue(el, next)),
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
          const row = e.currentTarget.closest<HTMLElement>('[role="treeitem"]')
          draft.onKeyDown(e)
          if (e.key === 'Enter' || e.key === 'Escape') {
            // Hand focus back to the row so keyboard navigation continues.
            row?.focus({ preventScroll: true })
            setEditing(false)
          }
        }}
      />
    )
  }
  return (
    <button
      type="button"
      tabIndex={-1}
      data-edit-value
      title={m.node_edit_text()}
      className="ml-1 flex h-5 min-w-0 flex-1 items-center truncate px-1 text-left text-foreground/80 hover:bg-background hover:ring-1 hover:ring-border"
      onClick={(e) => {
        e.stopPropagation()
        setEditing(true)
      }}
    >
      {defaultKey !== undefined && value !== '' ? (
        <DefaultChip name={defaultKey}>
          <VarText text={value.trim()} />
        </DefaultChip>
      ) : value.trim() === '' ? (
        <span className="text-muted-foreground/60 italic">
          {m.node_empty()}
        </span>
      ) : (
        <VarText
          text={value.trim()}
          className={cn(differs && 'default-differs leading-5')}
        />
      )}
    </button>
  )
}

/** Marks a value that equals its default, like the editor does. */
function DefaultChip({
  name,
  className,
  children,
}: {
  name: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      title={m.default_tooltip({ key: name })}
      className={cn('default-chip flex min-w-0 items-center pr-0.5', className)}
    >
      {children}
    </span>
  )
}
