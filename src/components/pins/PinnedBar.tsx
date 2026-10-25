import { IconPin, IconX } from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'

import { cycleTag, revealTag } from '#/components/editor/actions'
import { editAtPath, editorStore } from '#/components/editor/editor-store'
import { useDraft } from '#/components/inspector/use-draft'
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
import { useHighlightMap } from '#/hooks/use-highlights'
import { usePins } from '#/hooks/use-pins'
import { setValue } from '#/lib/document'
import { unpinTag } from '#/lib/store/pins'
import { cn } from '#/lib/utils'
import { allElements } from '#/lib/xml/locate'
import { isLeaf, leafValue } from '#/lib/xml/model'
import { m } from '#/paraglide/messages'
import type { XmlElement } from '#/lib/xml/model'

/** Pinned tags above the editor, each with its value editable in place. */
export function PinnedBar() {
  const pins = usePins()
  const doc = useSelector(editorStore, (s) => s.doc)
  const selectedPath = useSelector(editorStore, (s) => s.selectedPath)
  const highlights = useHighlightMap()

  if (pins.length === 0) return null

  const leaves = allElements(doc.nodes).filter(
    (el) => isLeaf(el) && !el.selfClosing && !el.json?.item,
  )

  return (
    <div
      role="toolbar"
      aria-label={m.pins_title()}
      className="flex shrink-0 flex-wrap items-center justify-center gap-1.5 border-b bg-muted/20 px-2 py-1.5"
    >
      <IconPin
        aria-hidden
        className="mr-0.5 size-3.5 shrink-0 text-muted-foreground"
      />
      {pins.map((pin) => {
        const matches = leaves.filter((el) => el.name === pin.tag)
        // Follow the cursor when it sits on one of several matches.
        const el = matches.find((e) => e.path === selectedPath) ?? matches[0]
        return (
          <PinnedField
            key={pin.id}
            tag={pin.tag}
            el={el}
            count={matches.length}
            color={highlights.get(pin.tag)}
          />
        )
      })}
    </div>
  )
}

function PinnedField({
  tag,
  el,
  count,
  color,
}: {
  tag: string
  el: XmlElement | undefined
  count: number
  color: string | undefined
}) {
  const value = el ? leafValue(el) : ''
  const path = el?.path
  const draft = useDraft(value, (next) => {
    if (path) editAtPath(path, (fresh) => setValue(fresh, next))
  })
  const placeholder = el ? m.node_empty() : m.pin_missing()
  const chars = Math.min(
    Math.max(draft.value.length, placeholder.length, 6),
    40,
  )

  return (
    <InputGroup className="h-6 w-auto max-w-80 bg-background font-mono">
      <InputGroupAddon className="py-0">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <button
              type="button"
              title={m.pin_cycle_hint()}
              className={cn(
                'cursor-pointer text-xs font-medium',
                color ? 'hl-tag px-1' : 'text-syntax-tag',
              )}
              style={
                color ? ({ '--hl': color } as React.CSSProperties) : undefined
              }
              onClick={() => cycleTag(tag)}
            >
              <span className={cn(color && 'hl-ink')}>{tag}</span>
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem
              disabled={count === 0}
              onSelect={() => revealTag(tag, 1)}
            >
              {m.highlight_next()}
            </ContextMenuItem>
            <ContextMenuItem
              disabled={count === 0}
              onSelect={() => revealTag(tag, -1)}
            >
              {m.highlight_prev()}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => unpinTag(tag)}>
              {m.pin_remove({ name: tag })}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </InputGroupAddon>
      <InputGroupInput
        aria-label={tag}
        disabled={!el}
        placeholder={placeholder}
        className="h-6 px-1.5 text-xs"
        style={{ width: `calc(${chars}ch + 0.75rem)` }}
        {...draft}
      />
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
          aria-label={m.pin_remove({ name: tag })}
          title={m.pin_remove({ name: tag })}
          className="text-muted-foreground"
          onClick={() => unpinTag(tag)}
        >
          <IconX className="size-3" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
