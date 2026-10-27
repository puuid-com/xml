import { Compartment, EditorState, Facet } from '@codemirror/state'

import { DYNAMIC_VARS, isDynamicVar } from '#/lib/xml/dynamic-vars'
import { m } from '#/paraglide/messages'
import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from '@codemirror/autocomplete'
import type { DynamicVar } from '#/lib/xml/dynamic-vars'

const descriptions: Partial<Record<string, () => string>> = {
  $guid: m.dynvar_guid,
  $timestamp: m.dynvar_timestamp,
  $isoTimestamp: m.dynvar_isoTimestamp,
  $randomUUID: m.dynvar_randomUUID,
  $randomAlphaNumeric: m.dynvar_randomAlphaNumeric,
  $randomBoolean: m.dynvar_randomBoolean,
  $randomInt: m.dynvar_randomInt,
  $randomColor: m.dynvar_randomColor,
  $randomHexColor: m.dynvar_randomHexColor,
  $randomAbbreviation: m.dynvar_randomAbbreviation,
}

/** Values of the active profile's plain variables. */
export const varValuesFacet = Facet.define<
  ReadonlyMap<string, string>,
  ReadonlyMap<string, string>
>({
  combine: (values) => values.at(-1) ?? new Map(),
})

const varValuesCompartment = new Compartment()

export function varValues(values: ReadonlyMap<string, string>) {
  return varValuesCompartment.of(varValuesFacet.of(values))
}

/** Effect that swaps in the values of another profile, or edited ones. */
export function setVarValues(values: ReadonlyMap<string, string>) {
  return varValuesCompartment.reconfigure(varValuesFacet.of(values))
}

/** Whether ⇧⌥V can fill in `<<name>>`. */
export function varHasValue(name: string, values: ReadonlyMap<string, string>) {
  return values.has(name) || isDynamicVar(name)
}

/**
 * Tooltip for a `<<name>>` chip: dynamic variables say what they stand for,
 * plain ones show their value in the profile.
 */
export function varTooltip(name: string, values: ReadonlyMap<string, string>) {
  const description = descriptions[name]?.()
  if (description) return m.var_dynamic_tooltip({ name, description })
  const value = values.get(name)
  if (value === undefined) return m.var_unset_tooltip({ name })
  return value === ''
    ? m.var_empty_tooltip({ name })
    : m.var_value_tooltip({ name, value: value.slice(0, 200) })
}

function el(tag: string, className: string, text?: string) {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/**
 * Side panel for the selected variable: what it stands for and its value
 * shown between the text around it.
 */
function varInfo(
  name: string,
  description: string | undefined,
  value: string,
  before: string,
  after: string,
) {
  const preview = el('div', 'cm-varInfo-preview')
  preview.appendChild(el('span', 'cm-varInfo-context', before))
  preview.appendChild(document.createTextNode(value))
  preview.appendChild(el('span', 'cm-varInfo-context', after))
  const dom = el('div', 'cm-varInfo')
  dom.appendChild(el('div', 'cm-varInfo-name', name))
  if (description) {
    dom.appendChild(el('div', 'cm-varInfo-description', description))
  }
  dom.appendChild(el('div', 'cm-varInfo-label', m.var_preview()))
  dom.appendChild(preview)
  return dom
}

/** A dynamic variable's panel, with a fresh sample. */
async function dynamicVarInfo(v: DynamicVar, before: string, after: string) {
  const { faker } = await import('@faker-js/faker')
  const sample = v.generate({ faker, now: new Date() })
  return varInfo(v.name, descriptions[v.name]?.(), sample, before, after)
}

/**
 * Offers the profile's variables and the dynamic ones after `<<`, `{{` or a
 * following `$`, and closes the `>>` or `}}`.
 */
function varCompletions(context: CompletionContext): CompletionResult | null {
  const before = context.matchBefore(/(?:<<|\{\{)\s*\$?[\w.-]*/)
  if (!before) return null
  const closing = before.text.startsWith('{') ? '}}' : '>>'
  const from = before.from + before.text.search(/[$\w]|$/)
  // Completing inside an existing `<<$name>>` replaces the rest of the name.
  const after = context.state.sliceDoc(context.pos, context.pos + 80)
  const tail = /^[\w.-]*/.exec(after)?.[0] ?? ''
  const close = (closing === '}}' ? /^\s*\}\}/ : /^\s*>>/).exec(
    after.slice(tail.length),
  )
  // The text value around the variable, for the preview.
  const line = context.state.doc.lineAt(before.from)
  const lead = (
    /[^>"]*$/.exec(line.text.slice(0, before.from - line.from))?.[0] ?? ''
  ).trimStart()
  const rest = close
    ? (/^[^<"]*/.exec(after.slice(tail.length + close[0].length))?.[0] ?? '')
    : ''
  const around = [lead.slice(-32), rest.trimEnd().slice(0, 32)] as const
  const values = context.state.facet(varValuesFacet)
  const plain: Array<Completion> = [...values].map(([name, value]) => ({
    label: name,
    detail: value.length > 24 ? `${value.slice(0, 24)}…` : value,
    type: 'variable',
    // Listed before the dynamic variables.
    boost: 1,
    apply: close ? name : name + closing,
    info: () =>
      varInfo(name, m.var_profile_value(), value.slice(0, 500), ...around),
  }))
  const dynamic: Array<Completion> = DYNAMIC_VARS.map((v) => ({
    label: v.name,
    type: 'variable',
    apply: close ? v.name : v.name + closing,
    info: () => dynamicVarInfo(v, ...around),
  }))
  const options = [...plain, ...dynamic]
  return {
    from,
    to: context.pos + tail.length,
    options,
    validFor: /^\$?[\w.-]*$/,
  }
}

/** Works in every language, next to the grammar's own completions. */
export const dynamicVarCompletions = EditorState.languageData.of(() => [
  { autocomplete: varCompletions },
])
