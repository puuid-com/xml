import { EditorState } from '@codemirror/state'

import { DYNAMIC_VARS } from '#/lib/xml/dynamic-vars'
import { m } from '#/paraglide/messages'
import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from '@codemirror/autocomplete'

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

/** Offers the dynamic variables after `<<` or `<<$`, and closes the `>>`. */
function varCompletions(context: CompletionContext): CompletionResult | null {
  const before = context.matchBefore(/<<\s*\$?[\w.-]*/)
  if (!before) return null
  const from = before.from + before.text.search(/[$\w]|$/)
  // Completing inside an existing `<<$name>>` replaces the rest of the name.
  const after = context.state.sliceDoc(context.pos, context.pos + 80)
  const tail = /^[\w.-]*/.exec(after)?.[0] ?? ''
  const closed = /^\s*>>/.test(after.slice(tail.length))
  const options: Array<Completion> = DYNAMIC_VARS.map((v) => ({
    label: v.name,
    type: 'variable',
    detail: descriptions[v.name]?.(),
    apply: closed ? v.name : `${v.name}>>`,
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
