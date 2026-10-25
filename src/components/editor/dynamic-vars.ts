import { EditorState } from '@codemirror/state'

import { DYNAMIC_VARS } from '#/lib/xml/dynamic-vars'
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

/** Tooltip for a `<<name>>` chip; dynamic variables say what they stand for. */
export function varTooltip(name: string) {
  const description = descriptions[name]?.()
  return description
    ? m.var_dynamic_tooltip({ name, description })
    : m.var_tooltip({ name })
}

function el(tag: string, className: string, text?: string) {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/**
 * Side panel for the selected variable: what it stands for and a fresh
 * sample shown between the text around it.
 */
async function varInfo(v: DynamicVar, before: string, after: string) {
  const { faker } = await import('@faker-js/faker')
  const preview = el('div', 'cm-varInfo-preview')
  preview.appendChild(el('span', 'cm-varInfo-context', before))
  preview.appendChild(
    document.createTextNode(v.generate({ faker, now: new Date() })),
  )
  preview.appendChild(el('span', 'cm-varInfo-context', after))
  const description = descriptions[v.name]?.()
  const dom = el('div', 'cm-varInfo')
  dom.appendChild(el('div', 'cm-varInfo-name', v.name))
  if (description) {
    dom.appendChild(el('div', 'cm-varInfo-description', description))
  }
  dom.appendChild(el('div', 'cm-varInfo-label', m.var_preview()))
  dom.appendChild(preview)
  return dom
}

/** Offers the dynamic variables after `<<` or `<<$`, and closes the `>>`. */
function varCompletions(context: CompletionContext): CompletionResult | null {
  const before = context.matchBefore(/<<\s*\$?[\w.-]*/)
  if (!before) return null
  const from = before.from + before.text.search(/[$\w]|$/)
  // Completing inside an existing `<<$name>>` replaces the rest of the name.
  const after = context.state.sliceDoc(context.pos, context.pos + 80)
  const tail = /^[\w.-]*/.exec(after)?.[0] ?? ''
  const close = /^\s*>>/.exec(after.slice(tail.length))
  // The text value around the variable, for the preview.
  const line = context.state.doc.lineAt(before.from)
  const lead = (
    /[^>"]*$/.exec(line.text.slice(0, before.from - line.from))?.[0] ?? ''
  ).trimStart()
  const rest = close
    ? (/^[^<"]*/.exec(after.slice(tail.length + close[0].length))?.[0] ?? '')
    : ''
  const options: Array<Completion> = DYNAMIC_VARS.map((v) => ({
    label: v.name,
    type: 'variable',
    apply: close ? v.name : `${v.name}>>`,
    info: () => varInfo(v, lead.slice(-32), rest.trimEnd().slice(0, 32)),
  }))
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
