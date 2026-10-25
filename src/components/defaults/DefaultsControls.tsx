import { IconChevronDown, IconReplace, IconTrash } from '@tabler/icons-react'
import { useForm } from '@tanstack/react-form'
import { useSelector } from '@tanstack/react-store'

import { applyDefaultsActive } from '#/components/editor/actions'
import { editorStore } from '#/components/editor/editor-store'
import { Button } from '#/components/ui/button'
import { ButtonGroup } from '#/components/ui/button-group'
import { Input } from '#/components/ui/input'
import { Kbd, KbdGroup } from '#/components/ui/kbd'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '#/components/ui/popover'
import { Separator } from '#/components/ui/separator'
import { Switch } from '#/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { useDefaults } from '#/hooks/use-defaults'
import { alt } from '#/lib/platform'
import {
  removeDefault,
  setDefault,
  toggleDefault,
  updateDefaultValue,
} from '#/lib/store/defaults'
import { defaultKeys } from '#/lib/xml/defaults'
import { m } from '#/paraglide/messages'
import type { DefaultValue } from '#/lib/store/defaults'

/** "Apply defaults" in the bottom bar, with a popover to manage the rules. */
export function DefaultsControls() {
  const rules = useDefaults()

  return (
    <ButtonGroup>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="xs" onClick={applyDefaultsActive}>
            <IconReplace />
            <span className="hidden md:inline">{m.defaults_apply()}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <KbdGroup>
            <Kbd>⇧</Kbd>
            <Kbd>{alt}</Kbd>
            <Kbd>D</Kbd>
          </KbdGroup>
        </TooltipContent>
      </Tooltip>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={m.defaults_title()}
          >
            <IconChevronDown className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-96 gap-0 p-0">
          <PopoverHeader className="px-3 py-2.5">
            <PopoverTitle>{m.defaults_title()}</PopoverTitle>
            <PopoverDescription>{m.defaults_description()}</PopoverDescription>
          </PopoverHeader>
          <Separator />
          {rules.length > 0 ? (
            <ul className="flex max-h-72 flex-col overflow-y-auto py-1">
              {rules.map((rule) => (
                <RuleRow key={rule.id} rule={rule} />
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-muted-foreground">
              {m.defaults_empty()}
            </p>
          )}
          <Separator />
          <AddDefaultForm existing={rules.map((r) => r.key)} />
        </PopoverContent>
      </Popover>
    </ButtonGroup>
  )
}

function RuleRow({ rule }: { rule: DefaultValue }) {
  return (
    <li className="flex items-center gap-2 px-3 py-1">
      <Switch
        size="sm"
        checked={rule.enabled}
        onCheckedChange={() => toggleDefault(rule.id)}
        aria-label={m.defaults_enable({ key: rule.key })}
      />
      <span
        className="w-28 shrink-0 truncate font-mono text-xs"
        title={rule.key}
      >
        {rule.key}
      </span>
      <Input
        aria-label={m.defaults_value_for({ key: rule.key })}
        className="h-7 flex-1 font-mono"
        value={rule.value}
        onChange={(e) => updateDefaultValue(rule.id, e.target.value)}
      />
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={m.defaults_remove({ key: rule.key })}
        title={m.defaults_remove({ key: rule.key })}
        onClick={() => removeDefault(rule.id)}
      >
        <IconTrash />
      </Button>
    </li>
  )
}

function AddDefaultForm({ existing }: { existing: Array<string> }) {
  const doc = useSelector(editorStore, (s) => s.doc)
  const taken = new Set(existing)
  const suggestions = defaultKeys(doc.nodes).filter((k) => !taken.has(k))
  const form = useForm({
    defaultValues: { key: '', value: '' },
    onSubmit: ({ value, formApi }) => {
      const key = value.key.trim()
      if (!key) return
      setDefault(key, value.value)
      formApi.reset()
    },
  })

  return (
    <form
      className="flex items-center gap-1 px-3 py-2.5"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field name="key">
        {(field) => (
          <Input
            list="default-key-suggestions"
            aria-label={m.defaults_key()}
            placeholder={m.defaults_key()}
            className="h-7 w-28 shrink-0 font-mono"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.Field>
      <datalist id="default-key-suggestions">
        {suggestions.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      <form.Field name="value">
        {(field) => (
          <Input
            aria-label={m.defaults_value()}
            placeholder={m.defaults_value()}
            className="h-7 flex-1 font-mono"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.Field>
      <form.Subscribe selector={(s) => s.values.key.trim() !== ''}>
        {(canSubmit) => (
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {m.defaults_add()}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
