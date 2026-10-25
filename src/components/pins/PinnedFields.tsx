import { IconPin, IconX } from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'

import { PanelHeading } from '#/components/app/PanelHeading'
import { cycleTag } from '#/components/editor/actions'
import { editAtPath, editorStore } from '#/components/editor/editor-store'
import { hlStyle } from '#/components/highlights/hl-style'
import {
  MatchNavItems,
  PinMenuItem,
  TagMenuHeader,
} from '#/components/highlights/TagMenuItems'
import { useDraft } from '#/components/inspector/use-draft'
import {
  ContextMenu,
  ContextMenuContent,
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
import { hasName, isTextLeaf, leafValue } from '#/lib/xml/model'
import { m } from '#/paraglide/messages'
import type { XmlElement } from '#/lib/xml/model'

/** Pinned tags at the top of the side panel, each editable in place. */
export function PinnedFields() {
  const pins = usePins()
  const doc = useSelector(editorStore, (s) => s.doc)
  const selectedPath = useSelector(editorStore, (s) => s.selectedPath)
  const highlights = useHighlightMap()

  if (pins.length === 0) return null

  const leaves = allElements(doc.nodes).filter(
    (el) => hasName(el) && isTextLeaf(el),
  )

  return (
    <section
      aria-label={m.pins_title()}
      className="flex max-h-[45%] shrink-0 flex-col border-b"
    >
      <PanelHeading>
        <IconPin aria-hidden className="size-3.5" />
        {m.pins_title()}
        <span className="tabular-nums">{pins.length}</span>
      </PanelHeading>
      <div className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 overflow-auto px-3 py-2">
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
    </section>
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
          <PinMenuItem tag={tag} />
        </ContextMenuContent>
      </ContextMenu>
      <InputGroup className="h-11 bg-background font-mono md:h-6">
        <InputGroupInput
          aria-label={tag}
          disabled={!el}
          placeholder={placeholder}
          className="h-11 px-1.5 text-base md:h-6 md:text-xs"
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
            className="text-muted-foreground max-md:size-11"
            onClick={() => unpinTag(tag)}
          >
            <IconX className="size-3" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </>
  )
}
