import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'

import { ColorSwatches, colorLabel } from './ColorSwatches'
import { hlStyle } from './hl-style'
import { SwatchMenuRow } from './SwatchMenuRow'
import { MatchNavItems, TagMenuHeader } from './TagMenuItems'
import { cycleTag } from '#/components/editor/actions'
import { Button } from '#/components/ui/button'
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
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
import { useHighlightSwatches, useHighlights } from '#/hooks/use-highlights'
import { useTagCounts } from '#/hooks/use-tag-counts'
import { localName } from '#/lib/names'
import { shortcutLabel, shortcuts } from '#/lib/shortcuts'
import {
  groupByColor,
  highlightCss,
  nextPreset,
  recolorGroup,
  removeHighlight,
  setGroupEnabled,
  setHighlight,
  toggleHighlight,
} from '#/lib/store/highlights'
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'
import type { Highlight } from '#/lib/store/highlights'

/**
 * Legend of highlight rules in the bottom bar. Rules sharing a colour sit in
 * one pill; each tag in it cycles through its matches.
 */
export function HighlightsBar() {
  const rules = useHighlights()
  const counts = useTagCounts()
  const countOf = (rule: Highlight) => counts.get(localName(rule.tag)) ?? 0

  return (
    <div
      role="toolbar"
      aria-label={m.highlights_title()}
      className="flex h-full min-w-0 shrink items-center gap-2 overflow-x-auto px-px [scrollbar-width:none]"
    >
      {groupByColor(rules).map((group) => (
        <ColorGroup key={group[0].id} rules={group} countOf={countOf} />
      ))}
      <AddRulePopover
        tagNames={[...counts.keys()].sort()}
        existing={rules.map((r) => localName(r.tag))}
      />
      {rules.length === 0 && (
        <span className="hidden truncate sm:inline">
          {m.highlights_hint_prefix()}{' '}
          <Kbd>{shortcutLabel(shortcuts.highlight)}</Kbd>{' '}
          {m.highlights_hint_suffix()}
        </span>
      )}
    </div>
  )
}

function ColorGroup({
  rules,
  countOf,
}: {
  rules: Array<Highlight>
  countOf: (rule: Highlight) => number
}) {
  const { color } = rules[0]
  const anyOn = rules.some((r) => r.enabled)
  const total = rules.reduce((sum, r) => sum + countOf(r), 0)
  return (
    <div
      role="group"
      aria-label={m.highlight_group({ color: colorLabel(color) })}
      className="flex shrink-0 items-center gap-1.5"
    >
      <div
        style={hlStyle(highlightCss(color))}
        className={cn(
          'flex items-stretch overflow-hidden',
          anyOn ? 'hl-tag' : 'rounded-[3px] ring-1 ring-(--hl)',
        )}
      >
        {rules.map((rule) => (
          <RuleSegment
            key={rule.id}
            rule={rule}
            count={countOf(rule)}
            group={rules}
          />
        ))}
      </div>
      <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
        {total}
      </span>
    </div>
  )
}

function RuleSegment({
  rule,
  count,
  group,
}: {
  rule: Highlight
  count: number
  group: Array<Highlight>
}) {
  const colors = useHighlightSwatches()
  const allOn = group.every((r) => r.enabled)
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cycleTag(rule.tag)}
          title={`${m.highlight_matches({ count })} · ${m.highlight_chip_hint()}`}
          aria-label={`${rule.tag}, ${m.highlight_matches({ count })}`}
          className={cn(
            'h-11 min-w-11 px-1.5 font-mono text-[11px] font-normal not-first:border-l not-first:border-(--hl)/35 hover:bg-(--hl)/15 data-[state=open]:bg-(--hl)/20 md:h-5 md:min-w-0 dark:hover:bg-(--hl)/20',
            rule.enabled ? 'hl-ink' : 'text-muted-foreground line-through',
          )}
        >
          {rule.tag}
        </Button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-72">
        <TagMenuHeader tag={rule.tag} />
        <ContextMenuCheckboxItem
          checked={rule.enabled}
          onCheckedChange={() => toggleHighlight(rule.id)}
        >
          {m.highlight_show()}
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <MatchNavItems tag={rule.tag} count={count} />
        <ContextMenuSeparator />
        <SwatchMenuRow
          colors={colors}
          label={m.highlight_label()}
          value={rule.color}
          onSelect={(c) => setHighlight(rule.tag, c)}
        />
        {group.length > 1 && (
          <>
            <ContextMenuSeparator />
            <ContextMenuCheckboxItem
              checked={allOn}
              onCheckedChange={() => setGroupEnabled(rule.color, !allOn)}
            >
              {m.highlight_group_show({ count: group.length })}
            </ContextMenuCheckboxItem>
            <SwatchMenuRow
              colors={colors}
              label={m.highlight_group_color({ count: group.length })}
              value={rule.color}
              onSelect={(c) => recolorGroup(rule.color, c)}
            />
          </>
        )}
        <ContextMenuSeparator />
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
          className="shrink-0 max-md:size-11"
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
  const colors = useHighlightSwatches()
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
      <ColorSwatches
        colors={colors}
        value={color ?? undefined}
        onSelect={setColor}
      />
    </form>
  )
}
