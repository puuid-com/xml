import {
  IconArrowDown,
  IconArrowUp,
  IconBraces,
  IconCopy,
  IconExternalLink,
  IconGripVertical,
  IconPinnedOff,
} from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'

import { notify } from '#/components/app/notice-store'
import { copyVar, cycleTag } from '#/components/editor/actions'
import { editAtPath, editorStore } from '#/components/editor/editor-store'
import { hlStyle } from '#/components/highlights/hl-style'
import {
  MatchNavItems,
  TagMenuHeader,
  ZplMenuItems,
} from '#/components/highlights/TagMenuItems'
import { LeafText } from '#/components/inspector/LeafText'
import { useDraft } from '#/components/inspector/use-draft'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '#/components/ui/context-menu'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '#/components/ui/input-group'
import { useEnabledDefaults } from '#/hooks/use-defaults'
import { useHighlightMap } from '#/hooks/use-highlights'
import { usePins } from '#/hooks/use-pins'
import { useFormatSettings } from '#/hooks/use-profiles'
import { setValue } from '#/lib/document'
import { localName, sameName } from '#/lib/names'
import { groupPins, pinRows } from '#/lib/pin-groups'
import { moveItem } from '#/lib/sort-order'
import { reorderPins, unpinTag } from '#/lib/store/pins'
import { cn } from '#/lib/utils'
import { isZplTag, openZplLabel } from '#/lib/zpl'
import { defaultIndex, isDefaultLeaf, leafDiffers } from '#/lib/xml/defaults'
import { allElements } from '#/lib/xml/locate'
import { hasName, isTextLeaf, leafValue } from '#/lib/xml/model'
import { m } from '#/paraglide/messages'
import type { XmlElement } from '#/lib/xml/model'

/**
 * Pinned tags at the top of the side panel, each editable in place, grouped
 * by highlight colour. Rows reorder within their group by dragging their
 * handle, or with the arrow keys on it.
 */
export function PinnedFields() {
  const pins = usePins()
  const doc = useSelector(editorStore, (s) => s.doc)
  const selectedPath = useSelector(editorStore, (s) => s.selectedPath)
  const highlights = useHighlightMap()
  const enabledDefaults = useEnabledDefaults()
  const defaults = useMemo(
    () => defaultIndex(enabledDefaults),
    [enabledDefaults],
  )
  const [unpinning, setUnpinning] = useState<string | null>(null)
  // Moving a row re-inserts its node, which drops focus; put it back after.
  const handles = useRef(new Map<string, HTMLButtonElement>())
  const refocus = useRef<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  // Indexes into `rows`; `to` is an insertion point between rows.
  const [drag, setDrag] = useState<{ from: number; to: number | null } | null>(
    null,
  )

  useEffect(() => {
    const id = refocus.current
    refocus.current = null
    if (id) handles.current.get(id)?.focus()
  }, [pins])

  if (pins.length === 0) return null

  const groups = groupPins(pins, (pin) => highlights.get(localName(pin.tag)))
  const rows = pinRows(groups)

  // Saving the grouped order keeps each group's pins together.
  const move = (from: number, to: number) => {
    const { pin, first, last } = rows[from]
    const target = Math.max(first, Math.min(to, last))
    if (target === from) return
    reorderPins(
      moveItem(
        rows.map((r) => r.pin.id),
        from,
        target,
      ),
    )
    refocus.current = pin.id
    setAnnouncement(
      m.pin_moved({
        name: pin.tag,
        position: target - first + 1,
        count: last - first + 1,
      }),
    )
  }

  const onHandleKey = (e: React.KeyboardEvent, index: number) => {
    const { first, last } = rows[index]
    const to = {
      ArrowUp: index - 1,
      ArrowDown: index + 1,
      Home: first,
      End: last,
    }[e.key]
    if (to === undefined) return
    e.preventDefault()
    move(index, to)
  }

  const drop = () => {
    if (drag?.to == null) return
    move(drag.from, drag.to > drag.from ? drag.to - 1 : drag.to)
  }

  const leaves = allElements(doc.nodes).filter(
    (el) => hasName(el) && isTextLeaf(el),
  )

  return (
    <section
      aria-label={m.pins_title()}
      className="flex max-h-[45%] shrink-0 flex-col border-b"
    >
      <div className="grid min-h-0 grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 overflow-auto py-2 pr-3 pl-1">
        {rows.map(({ pin, group, first, last }, index) => {
          const matches = leaves.filter((el) => sameName(el.name, pin.tag))
          // Follow the cursor when it sits on one of several matches.
          const el = matches.find((e) => e.path === selectedPath) ?? matches.at(0)
          return (
            <Fragment key={pin.id}>
              {index === first && group > 0 && (
                <div
                  aria-hidden
                  className="col-span-2 col-start-2 my-1 h-px bg-border"
                />
              )}
              <div
                onDragOver={(e) => {
                  if (!drag || rows[drag.from].group !== group) return
                  e.preventDefault()
                  const box = e.currentTarget.getBoundingClientRect()
                  const after = e.clientY > box.top + box.height / 2
                  const to = index + Number(after)
                  if (to !== drag.to) setDrag({ ...drag, to })
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  drop()
                  setDrag(null)
                }}
                className={cn(
                  'col-span-3 grid grid-cols-subgrid items-center',
                  drag?.from === index && 'opacity-50',
                  drag?.to === index && 'shadow-[0_-2px_0_var(--ring)]',
                  drag?.to === index + 1 &&
                    index === last &&
                    'shadow-[0_2px_0_var(--ring)]',
                )}
              >
                <button
                  type="button"
                  draggable
                  ref={(node) => {
                    if (node) handles.current.set(pin.id, node)
                    else handles.current.delete(pin.id)
                  }}
                  aria-label={m.pin_move({ name: pin.tag })}
                  title={m.pin_move_hint()}
                  onKeyDown={(e) => onHandleKey(e, index)}
                  onDragStart={(e) => {
                    setDrag({ from: index, to: null })
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', pin.tag)
                    // Drag the whole row, not just the handle.
                    const row = e.currentTarget.parentElement
                    if (row) e.dataTransfer.setDragImage(row, 8, 8)
                  }}
                  onDragEnd={() => setDrag(null)}
                  className="grid min-h-11 w-5 cursor-grab place-items-center text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing md:min-h-6"
                >
                  <IconGripVertical aria-hidden className="size-3.5" />
                </button>
                <PinnedField
                  tag={pin.tag}
                  el={el}
                  count={matches.length}
                  defaultKey={
                    el && isDefaultLeaf(defaults, el) ? el.name : undefined
                  }
                  differs={!!el && leafDiffers(defaults, el)}
                  color={highlights.get(localName(pin.tag))}
                  onMoveUp={
                    index > first ? () => move(index, index - 1) : undefined
                  }
                  onMoveDown={
                    index < last ? () => move(index, index + 1) : undefined
                  }
                  onUnpin={() => setUnpinning(pin.tag)}
                />
              </div>
            </Fragment>
          )
        })}
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <AlertDialog
        open={!!unpinning}
        onOpenChange={(open) => {
          if (!open) setUnpinning(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {m.pin_remove({ name: unpinning ?? '' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {m.pin_remove_description()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.cancel()}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (unpinning) unpinTag(unpinning)
              }}
            >
              {m.pin_remove_confirm()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function PinnedField({
  tag,
  el,
  count,
  defaultKey,
  differs,
  color,
  onMoveUp,
  onMoveDown,
  onUnpin,
}: {
  tag: string
  el: XmlElement | undefined
  count: number
  /** Set when the value equals the default for this key. */
  defaultKey: string | undefined
  /** Whether the value differs from the default for this key. */
  differs: boolean
  color: string | undefined
  /** Unset when the row can't move that way. */
  onMoveUp: (() => void) | undefined
  onMoveDown: (() => void) | undefined
  onUnpin: () => void
}) {
  const value = el ? leafValue(el) : ''
  const path = el?.path
  const draft = useDraft(value, (next) => {
    if (path) editAtPath(path, (fresh) => setValue(fresh, next))
  })
  const placeholder = el ? m.node_empty() : m.pin_missing()
  const zpl = isZplTag(useFormatSettings().zplTags, tag)
  // Show the value like the tree does until the field is being edited.
  const [editing, setEditing] = useState(false)
  const rendered = !!el && !editing && draft.value.trim() !== ''

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            type="button"
            title={m.pin_cycle_hint()}
            className={cn(
              'min-h-11 max-w-40 cursor-pointer truncate text-left font-mono text-xs font-medium md:min-h-0',
              color ? 'hl-tag px-1' : 'text-syntax-tag',
            )}
            style={hlStyle(color)}
            onClick={() => cycleTag(tag)}
          >
            <span className={cn(color && 'hl-ink')}>{tag}</span>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <TagMenuHeader tag={tag} />
          <MatchNavItems tag={tag} count={count} />
          <ContextMenuSeparator />
          <ContextMenuItem disabled={!onMoveUp} onSelect={onMoveUp}>
            <IconArrowUp />
            {m.pin_move_up()}
          </ContextMenuItem>
          <ContextMenuItem disabled={!onMoveDown} onSelect={onMoveDown}>
            <IconArrowDown />
            {m.pin_move_down()}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ZplMenuItems tag={tag} value={el ? draft.value : undefined} />
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onSelect={onUnpin}>
            <IconPinnedOff />
            {m.pin_remove({ name: tag })}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <InputGroup className="h-11 bg-background font-mono md:h-6">
        <div className="relative flex h-full min-w-0 flex-1">
          <InputGroupInput
            aria-label={tag}
            disabled={!el}
            placeholder={placeholder}
            className={cn(
              'h-11 px-1.5 text-base md:h-6 md:text-xs',
              rendered && 'text-transparent',
            )}
            {...draft}
            onFocus={() => {
              draft.onFocus()
              setEditing(true)
            }}
            onBlur={() => {
              draft.onBlur()
              setEditing(false)
            }}
          />
          {rendered && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 flex min-w-0 items-center overflow-hidden px-1.5 text-base md:text-xs"
            >
              <LeafText
                value={draft.value}
                defaultKey={defaultKey}
                differs={differs}
              />
            </span>
          )}
        </div>
        {count > 1 && (
          <InputGroupAddon align="inline-end" className="py-0">
            <InputGroupText
              title={m.highlight_matches({ count })}
              className="tabular-nums"
            >
              {count}
            </InputGroupText>
          </InputGroupAddon>
        )}
        <InputGroupAddon align="inline-end" className="py-0">
          <InputGroupButton
            size="icon-xs"
            aria-label={m.pin_copy({ name: tag })}
            title={m.pin_copy({ name: tag })}
            disabled={!el}
            className="text-muted-foreground max-md:size-11"
            onClick={() => {
              void navigator.clipboard.writeText(draft.value)
              notify.success(m.copied(), { detail: draft.value })
            }}
          >
            <IconCopy className="size-3" />
          </InputGroupButton>
          <InputGroupButton
            size="icon-xs"
            aria-label={m.pin_copy_var({ name: tag })}
            title={m.pin_copy_var({ name: tag })}
            className="text-muted-foreground max-md:size-11"
            onClick={() => copyVar(localName(tag))}
          >
            <IconBraces className="size-3" />
          </InputGroupButton>
          {zpl && (
            <InputGroupButton
              size="icon-xs"
              aria-label={m.zpl_open_name({ name: tag })}
              title={m.zpl_open_name({ name: tag })}
              disabled={!el || !draft.value.trim()}
              className="text-muted-foreground max-md:size-11"
              onClick={() => openZplLabel(draft.value)}
            >
              <IconExternalLink className="size-3" />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </>
  )
}
