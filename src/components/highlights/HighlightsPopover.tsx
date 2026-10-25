import { IconHighlight, IconPlus, IconTrash } from '@tabler/icons-react'
import { useForm } from '@tanstack/react-form'
import { useSelector } from '@tanstack/react-store'
import { useState } from 'react'

import { ColorDot, ColorSwatches } from './ColorSwatches'
import { editorStore } from '#/components/editor/editor-store'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '#/components/ui/popover'
import { Switch } from '#/components/ui/switch'
import { useHighlights } from '#/hooks/use-highlights'
import {
  nextPreset,
  removeHighlight,
  setHighlight,
  toggleHighlight,
} from '#/lib/store/highlights'
import { allElements } from '#/lib/xml/locate'
import { m } from '#/paraglide/messages'
import type { Highlight } from '#/lib/store/highlights'

export function HighlightsPopover() {
  const rules = useHighlights()
  const doc = useSelector(editorStore, (s) => s.doc)

  const counts = new Map<string, number>()
  for (const el of allElements(doc.nodes)) {
    counts.set(el.name, (counts.get(el.name) ?? 0) + 1)
  }
  const tagNames = [...counts.keys()].sort()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <IconHighlight />
          <span className="hidden sm:inline">{m.highlights_title()}</span>
          {rules.length > 0 && (
            <span className="flex -space-x-0.5">
              {rules.slice(0, 4).map((r) => (
                <ColorDot
                  key={r.id}
                  color={r.color}
                  className="ring-1 ring-background"
                />
              ))}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <PopoverHeader className="border-b p-3">
          <PopoverTitle>{m.highlights_title()}</PopoverTitle>
          <PopoverDescription>{m.highlights_description()}</PopoverDescription>
        </PopoverHeader>
        {rules.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">
            {m.highlights_empty()}
          </p>
        ) : (
          <ul className="max-h-72 divide-y overflow-auto">
            {rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                count={counts.get(rule.tag) ?? 0}
              />
            ))}
          </ul>
        )}
        <AddRuleForm tagNames={tagNames} existing={rules.map((r) => r.tag)} />
      </PopoverContent>
    </Popover>
  )
}

function RuleRow({ rule, count }: { rule: Highlight; count: number }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="px-3 py-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-label={m.highlight_change_color({ name: rule.tag })}
          onClick={() => setOpen((o) => !o)}
          className="grid size-5 place-items-center rounded-full hover:bg-muted"
        >
          <ColorDot color={rule.color} className="size-3" />
        </button>
        <span className="min-w-0 flex-1 truncate font-mono text-xs">
          {rule.tag}
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {m.highlight_matches({ count })}
        </span>
        <Switch
          size="sm"
          checked={rule.enabled}
          onCheckedChange={() => toggleHighlight(rule.id)}
          aria-label={m.highlight_toggle({ name: rule.tag })}
        />
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={m.highlight_remove()}
          title={m.highlight_remove()}
          onClick={() => removeHighlight(rule.id)}
        >
          <IconTrash />
        </Button>
      </div>
      {open && (
        <ColorSwatches
          className="mt-2 pl-7"
          value={rule.color}
          onSelect={(c) => setHighlight(rule.tag, c)}
        />
      )}
    </li>
  )
}

function AddRuleForm({
  tagNames,
  existing,
}: {
  tagNames: Array<string>
  existing: Array<string>
}) {
  const [color, setColor] = useState<string | null>(null)
  const form = useForm({
    defaultValues: { tag: '' },
    onSubmit: ({ value, formApi }) => {
      const tag = value.tag.trim()
      if (!tag) return
      setHighlight(tag, color ?? nextPreset())
      setColor(null)
      formApi.reset()
    },
  })
  const suggestions = tagNames.filter((t) => !existing.includes(t))

  return (
    <form
      className="space-y-2 border-t bg-muted/30 p-3"
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
              <IconPlus />
              {m.highlight_add()}
            </Button>
          )}
        </form.Subscribe>
      </div>
      <ColorSwatches value={color ?? undefined} onSelect={setColor} />
    </form>
  )
}
