import {
  IconArrowDown,
  IconArrowUp,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'
import { useForm } from '@tanstack/react-form'
import { useSelector } from '@tanstack/react-store'
import { useState } from 'react'

import { ColorSwatches } from './ColorSwatches'
import { cycleTag, revealTag } from '#/components/editor/actions'
import { editorStore } from '#/components/editor/editor-store'
import { Button } from '#/components/ui/button'
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '#/components/ui/context-menu'
import { Input } from '#/components/ui/input'
import { Kbd } from '#/components/ui/kbd'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '#/components/ui/popover'
import { useHighlights } from '#/hooks/use-highlights'
import { alt } from '#/lib/platform'
import {
  highlightCss,
  nextPreset,
  removeHighlight,
  setHighlight,
  toggleHighlight,
} from '#/lib/store/highlights'
import { cn } from '#/lib/utils'
import { allElements } from '#/lib/xml/locate'
import { m } from '#/paraglide/messages'
import type { Highlight } from '#/lib/store/highlights'

/** Tag name → number of elements with it in the active document. */
export function useTagCounts(): ReadonlyMap<string, number> {
  const doc = useSelector(editorStore, (s) => s.doc)
  const counts = new Map<string, number>()
  for (const el of allElements(doc.nodes)) {
    if (el.json?.item) continue
    counts.set(el.name, (counts.get(el.name) ?? 0) + 1)
  }
  return counts
}

/** Legend of highlight rules in the bottom bar; each chip cycles through its matches. */
export function HighlightsBar() {
  const rules = useHighlights()
  const counts = useTagCounts()

  return (
    <div
      role="toolbar"
      aria-label={m.highlights_title()}
      className="flex h-full min-w-0 shrink items-center gap-1 overflow-x-auto [scrollbar-width:none]"
    >
      {rules.map((rule) => (
        <RuleChip key={rule.id} rule={rule} count={counts.get(rule.tag) ?? 0} />
      ))}
      <AddRulePopover
        tagNames={[...counts.keys()].sort()}
        existing={rules.map((r) => r.tag)}
      />
      {rules.length === 0 && (
        <span className="hidden truncate sm:inline">
          {m.highlights_hint_prefix()} <Kbd>{alt}H</Kbd>{' '}
          {m.highlights_hint_suffix()}
        </span>
      )}
    </div>
  )
}

function RuleChip({ rule, count }: { rule: Highlight; count: number }) {
  const style = { '--hl': highlightCss(rule.color) } as React.CSSProperties
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cycleTag(rule.tag)}
          title={m.highlight_chip_hint()}
          className="h-6 min-w-0 shrink-0 gap-1.5 px-1.5 font-mono text-[11px] font-normal"
        >
          <span
            style={style}
            className={cn(
              'px-0.5',
              rule.enabled
                ? 'hl-tag hl-ink'
                : 'rounded-[2px] text-muted-foreground line-through ring-1 ring-(--hl)',
            )}
          >
            {rule.tag}
          </span>
          <span
            className="text-muted-foreground tabular-nums"
            aria-label={m.highlight_matches({ count })}
          >
            {count}
          </span>
        </Button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuCheckboxItem
          checked={rule.enabled}
          onCheckedChange={() => toggleHighlight(rule.id)}
        >
          {m.highlight_show()}
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          disabled={count === 0}
          onSelect={() => revealTag(rule.tag, 1)}
        >
          <IconArrowDown />
          {m.highlight_next()}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={count === 0}
          onSelect={() => revealTag(rule.tag, -1)}
        >
          <IconArrowUp />
          {m.highlight_prev()}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>{m.highlight_color()}</ContextMenuSubTrigger>
          <ContextMenuSubContent className="p-2">
            <ColorSwatches
              value={rule.color}
              onSelect={(c) => setHighlight(rule.tag, c)}
            />
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem
          variant="destructive"
          onSelect={() => removeHighlight(rule.id)}
        >
          <IconTrash />
          {m.highlight_remove()}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function AddRulePopover({
  tagNames,
  existing,
}: {
  tagNames: Array<string>
  existing: Array<string>
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="shrink-0"
          aria-label={m.highlight_add_tag()}
          title={m.highlight_add_tag()}
        >
          <IconPlus />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-72">
        <PopoverHeader>
          <PopoverTitle>{m.highlight_add_tag()}</PopoverTitle>
          <PopoverDescription>{m.highlights_description()}</PopoverDescription>
        </PopoverHeader>
        <AddRuleForm
          tagNames={tagNames}
          existing={existing}
          onDone={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

function AddRuleForm({
  tagNames,
  existing,
  onDone,
}: {
  tagNames: Array<string>
  existing: Array<string>
  onDone: () => void
}) {
  const [color, setColor] = useState<string | null>(null)
  const form = useForm({
    defaultValues: { tag: '' },
    onSubmit: ({ value }) => {
      const tag = value.tag.trim()
      if (!tag) return
      setHighlight(tag, color ?? nextPreset())
      onDone()
    },
  })
  const taken = new Set(existing)
  const suggestions = tagNames.filter((t) => !taken.has(t))

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <div className="flex items-center gap-1">
        <form.Field name="tag">
          {(field) => (
            <Input
              list="highlight-tag-suggestions"
              aria-label={m.highlight_tag_name()}
              placeholder={m.highlight_tag_name()}
              className="h-7 flex-1 font-mono"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          )}
        </form.Field>
        <datalist id="highlight-tag-suggestions">
          {suggestions.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <form.Subscribe selector={(s) => s.values.tag.trim() !== ''}>
          {(canSubmit) => (
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {m.highlight_add()}
            </Button>
          )}
        </form.Subscribe>
      </div>
      <ColorSwatches value={color ?? undefined} onSelect={setColor} />
    </form>
  )
}
