import {
  IconChevronDown,
  IconChevronRight,
  IconChevronsDown,
  IconChevronsUp,
  IconExternalLink,
  IconPin,
} from '@tabler/icons-react'
import { useState } from 'react'

import { CopyPathMenuItems } from './CopyPathMenuItems'
import { DefaultChip, LeafText } from './LeafText'
import { Highlighted } from './SearchHighlight'
import { useDraft } from './use-draft'
import { VarText } from './VarText'
import { editAtPath, revealElement } from '#/components/editor/editor-store'
import { hlStyle } from '#/components/highlights/hl-style'
import {
  HighlightMenuItems,
  PinMenuItem,
  SortOrderMenuItem,
  TagMenuHeader,
  ZplMenuItems,
} from '#/components/highlights/TagMenuItems'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '#/components/ui/context-menu'
import { setValue } from '#/lib/document'
import { cn } from '#/lib/utils'
import { openZplLabel } from '#/lib/zpl'
import {
  attrDiffers,
  isDefaultAttr,
  isDefaultLeaf,
  leafDiffers,
} from '#/lib/xml/defaults'
import { allElements } from '#/lib/xml/locate'
import { hasName, isLeaf, isTextLeaf, leafValue } from '#/lib/xml/model'
import { m } from '#/paraglide/messages'
import type { DefaultIndex } from '#/lib/xml/defaults'
import type { TreeRow } from '#/lib/xml/locate'
import type { XmlElement } from '#/lib/xml/model'

const INDENT = 14
/** Attributes shown inline; the rest are counted. */
const MAX_ATTRS = 3

export function TreeRowView({
  row,
  index,
  active,
  onFocusRow,
  onEditingChange,
  rowHeight,
  onCollapse,
  top,
  defaults,
  selected,
  color,
  pinned,
  zpl,
}: {
  row: TreeRow
  index: number
  /** Whether this row is the tree's single Tab stop. */
  active: boolean
  onFocusRow: (path: string) => void
  onEditingChange: (path: string | null) => void
  rowHeight: number
  onCollapse: (paths: Array<string>, collapse: boolean) => void
  top: number
  defaults: DefaultIndex
  selected: boolean
  color: string | undefined
  pinned: boolean
  /** Whether the tag is a text leaf holding a base64 ZPL label. */
  zpl: boolean
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
            height: rowHeight,
            paddingLeft: 6 + depth * INDENT,
          }}
        >
          {hasChildren ? (
            <button
              type="button"
              tabIndex={-1}
              aria-label={collapsed ? m.tree_expand() : m.tree_collapse()}
              className="grid size-8 shrink-0 place-items-center text-muted-foreground hover:text-foreground md:size-4"
              onClick={(e) => {
                e.stopPropagation()
                onCollapse([el.path], !collapsed)
              }}
            >
              {collapsed ? (
                <IconChevronRight className="size-3" />
              ) : (
                <IconChevronDown className="size-3" />
              )}
            </button>
          ) : (
            <span className="size-8 shrink-0 md:size-4" />
          )}
          <TagLabel el={el} color={color} defaults={defaults} />
          {textLeaf && (
            <LeafValue
              path={el.path}
              onEditingChange={onEditingChange}
              value={leafValue(el)}
              defaultKey={isDefaultLeaf(defaults, el) ? el.name : undefined}
              differs={leafDiffers(defaults, el)}
            />
          )}
          {isLeaf(el) && el.selfClosing && <span className="flex-1" />}
          {empty && <span className="ml-1 text-syntax-punct">{empty}</span>}
          <RowMarks el={el} zpl={zpl} pinned={pinned} />
        </div>
      </ContextMenuTrigger>
      <TreeRowMenu el={el} onCollapse={onCollapse} hasChildren={hasChildren} />
    </ContextMenu>
  )
}

/** Trailing marks of a row: the ZPL viewer link, then the pin. */
function RowMarks({
  el,
  zpl,
  pinned,
}: {
  el: XmlElement
  zpl: boolean
  pinned: boolean
}) {
  return (
    <>
      {zpl && <ZplOpenButton el={el} />}
      {pinned && (
        <IconPin
          aria-label={m.pins_title()}
          className="size-3 shrink-0 text-muted-foreground"
        />
      )}
    </>
  )
}

/** Opens a leaf's base64 ZPL label in the ZPL viewer. */
function ZplOpenButton({ el }: { el: XmlElement }) {
  const value = leafValue(el)
  if (value.trim() === '') return null
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={m.zpl_open_name({ name: el.name })}
      className="grid size-8 shrink-0 place-items-center text-muted-foreground hover:text-foreground md:size-4"
      onClick={(e) => {
        e.stopPropagation()
        openZplLabel(value)
      }}
    >
      <IconExternalLink className="size-3" />
    </button>
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
        <Highlighted text={el.name} />
      </span>
      {el.attrs.slice(0, MAX_ATTRS).map((attr) => (
        <span
          key={attr.name}
          className="flex min-w-0 shrink items-center truncate"
        >
          <span className="text-syntax-attr">
            <Highlighted text={attr.name} />
          </span>
          <span className="text-syntax-punct">=</span>
          {isDefaultAttr(defaults, attr) ? (
            <DefaultChip className="max-w-32">
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
  onCollapse,
  hasChildren,
}: {
  el: XmlElement
  onCollapse: (paths: Array<string>, collapse: boolean) => void
  hasChildren: boolean
}) {
  // Collapsing keeps this row open; expanding opens it too.
  const collapseChildren = (collapse: boolean) => {
    const descendants = allElements([el])
      .filter((e) => e !== el && !isLeaf(e))
      .map((e) => e.path)
    onCollapse(collapse ? descendants : [el.path, ...descendants], collapse)
  }

  return (
    <ContextMenuContent className="w-72">
      <TagMenuHeader tag={el.name} el={el} />
      {hasName(el) && (
        <>
          <HighlightMenuItems tag={el.name} />
          {isTextLeaf(el) && <PinMenuItem tag={el.name} />}
          <SortOrderMenuItem tag={el.name} />
          {isTextLeaf(el) && (
            <ZplMenuItems tag={el.name} value={leafValue(el)} />
          )}
          <ContextMenuSeparator />
        </>
      )}
      {hasChildren && (
        <>
          <ContextMenuItem onSelect={() => collapseChildren(true)}>
            <IconChevronsUp />
            {m.tree_collapse_all()}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => collapseChildren(false)}>
            <IconChevronsDown />
            {m.tree_expand_all()}
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      )}
      <CopyPathMenuItems el={el} />
    </ContextMenuContent>
  )
}

/** Leaf text shown inline; click to edit in place. */
function LeafValue({
  path,
  onEditingChange,
  value,
  defaultKey,
  differs,
}: {
  path: string
  onEditingChange: (path: string | null) => void
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
        className="ml-1 h-10 min-w-0 flex-1 border border-ring bg-background px-1 font-mono text-base outline-none md:h-5 md:text-xs"
        {...draft}
        onClick={(e) => e.stopPropagation()}
        onBlur={() => {
          draft.onBlur()
          setEditing(false)
          onEditingChange(null)
        }}
        onKeyDown={(e) => {
          const row = e.currentTarget.closest<HTMLElement>('[role="treeitem"]')
          draft.onKeyDown(e)
          if (e.key === 'Enter' || e.key === 'Escape') {
            // Hand focus back to the row so keyboard navigation continues.
            row?.focus({ preventScroll: true })
            setEditing(false)
            onEditingChange(null)
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
      className="ml-1 flex h-10 min-w-0 flex-1 items-center truncate px-1 text-left text-foreground/80 hover:bg-background hover:ring-1 hover:ring-border md:h-5"
      onClick={(e) => {
        e.stopPropagation()
        onEditingChange(path)
        setEditing(true)
      }}
    >
      <LeafText value={value} defaultKey={defaultKey} differs={differs} />
    </button>
  )
}
