import { IconTrash } from '@tabler/icons-react'
import { useForm } from '@tanstack/react-form'
import { useSelector } from '@tanstack/react-store'
import { useMemo } from 'react'

import { editorStore, getText } from '#/components/editor/editor-store'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Separator } from '#/components/ui/separator'
import { useVariables } from '#/hooks/use-variables'
import {
  isVariableName,
  removeVariable,
  setVariable,
  updateVariableValue,
} from '#/lib/store/variables'
import { findVars } from '#/lib/xml/vars'
import { m } from '#/paraglide/messages'
import type { Variable } from '#/lib/store/variables'

/** Variable values of the active profile, shown in the settings popover. */
export function VariablesList() {
  const variables = useVariables()

  return (
    <>
      <p className="px-3 py-2.5 text-muted-foreground">
        {m.variables_description()}
      </p>
      <Separator />
      {variables.length > 0 ? (
        <ul className="flex max-h-72 flex-col overflow-y-auto py-1">
          {variables.map((variable) => (
            <VariableRow key={variable.id} variable={variable} />
          ))}
        </ul>
      ) : (
        <p className="px-3 py-3 text-muted-foreground">{m.variables_empty()}</p>
      )}
      <Separator />
      <AddVariableForm existing={variables.map((v) => v.name)} />
    </>
  )
}

function VariableRow({ variable }: { variable: Variable }) {
  const { name } = variable
  return (
    <li className="flex items-center gap-2 px-3 py-1">
      <span className="w-28 shrink-0 truncate font-mono text-xs" title={name}>
        {name}
      </span>
      <Input
        aria-label={m.variables_value_for({ name })}
        className="h-7 flex-1 font-mono"
        value={variable.value}
        onChange={(e) => updateVariableValue(variable.id, e.target.value)}
      />
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={m.variables_remove({ name })}
        title={m.variables_remove({ name })}
        onClick={() => removeVariable(variable.id)}
      >
        <IconTrash />
      </Button>
    </li>
  )
}

/** Plain variables used in the open file and not set yet, as suggestions. */
function useSuggestedNames(existing: Array<string>) {
  const revision = useSelector(editorStore, (s) => s.revision)
  return useMemo(() => {
    void revision
    const taken = new Set(existing)
    const names = findVars(getText()).map((v) => v.name)
    return [...new Set(names)].filter(
      (name) => isVariableName(name) && !taken.has(name),
    )
  }, [revision, existing])
}

function AddVariableForm({ existing }: { existing: Array<string> }) {
  const suggestions = useSuggestedNames(existing)
  const form = useForm({
    defaultValues: { name: '', value: '' },
    onSubmit: ({ value, formApi }) => {
      const name = value.name.trim()
      if (!isVariableName(name)) return
      setVariable(name, value.value)
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
      <form.Field name="name">
        {(field) => (
          <Input
            list="variable-name-suggestions"
            aria-label={m.variables_name()}
            placeholder={m.variables_name()}
            className="h-7 w-28 shrink-0 font-mono"
            value={field.state.value}
            aria-invalid={
              field.state.value.trim() !== '' &&
              !isVariableName(field.state.value.trim())
            }
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.Field>
      <datalist id="variable-name-suggestions">
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <form.Field name="value">
        {(field) => (
          <Input
            aria-label={m.variables_value()}
            placeholder={m.variables_value()}
            className="h-7 flex-1 font-mono"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.Field>
      <form.Subscribe selector={(s) => isVariableName(s.values.name.trim())}>
        {(canSubmit) => (
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {m.variables_add()}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
