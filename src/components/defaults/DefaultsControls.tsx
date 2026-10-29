import { IconTrash } from '@tabler/icons-react'
import { useForm } from '@tanstack/react-form'
import { useSelector } from '@tanstack/react-store'

import { editorStore } from '#/components/editor/editor-store'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Separator } from '#/components/ui/separator'
import { Switch } from '#/components/ui/switch'
import { useDefaults } from '#/hooks/use-defaults'
import {
  removeDefault,
  setDefault,
  toggleDefault,
  updateDefaultValue,
} from '#/lib/store/defaults'
import { localName } from '#/lib/names'
import { defaultKeys } from '#/lib/xml/defaults'
import { m } from '#/paraglide/messages'
import type { DefaultValue } from '#/lib/store/defaults'

/** Default value rules, shown in the bottom bar's settings popover. */
export function DefaultsRules() {
  const rules = useDefaults()

  return (
    <>
      <p className="px-3 py-2.5 text-muted-foreground">
        {m.defaults_description()}
      </p>
      <Separator />
      {rules.length > 0 ? (
        <ul className="flex max-h-72 flex-col overflow-y-auto py-1">
          {rules.map((rule) => (
            <RuleRow key={rule.id} rule={rule} />
          ))}
        </ul>
      ) : (
        <p className="px-3 py-3 text-muted-foreground">{m.defaults_empty()}</p>
      )}
      <Separator />
      <AddDefaultForm existing={rules.map((r) => r.key)} />
    </>
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
        onClick={() => removeDefault(rule.id)}
      >
        <IconTrash />
      </Button>
    </li>
  )
}

function AddDefaultForm({ existing }: { existing: Array<string> }) {
  const doc = useSelector(editorStore, (s) => s.doc)
  const taken = new Set(existing.map(localName))
  const suggestions = defaultKeys(doc.nodes).filter((k) => !taken.has(k))
  const form = useForm({
    defaultValues: { key: '', value: '' },
    onSubmit: ({ value, formApi }) => {
      const key = value.key.trim()
      if (!key) return
      return setDefault(key, value.value).isPersisted.promise.then(
        () => formApi.reset(),
        () => {
          // Keep the entered value when the workspace reports a save error.
        },
      )
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
      <form.Subscribe
        selector={(s) => !s.isSubmitting && s.values.key.trim() !== ''}
      >
        {(canSubmit) => (
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {m.defaults_add()}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
