import { parseJsonAst } from './parse'
import { localName } from '#/lib/names'
import { nameOrder } from '#/lib/xml/format'
import { trimVar, varRegExp } from '#/lib/xml/vars'
import type { JsonValue } from './parse'
import type { FormatOptions, FormatResult } from '#/lib/xml/format'

/**
 * Pretty-prints JSON, one entry per line. Strings and numbers are copied as
 * written, so escapes and number precision never change. Refuses documents
 * with errors. Sorting orders object keys; arrays keep their order.
 */
export function formatJson(
  text: string,
  {
    indent = '  ',
    removeEmptyLines = true,
    trimVars = false,
    sort = 'none',
    order = [],
    first = [],
  }: FormatOptions = {},
): FormatResult {
  const { value, errors } = parseJsonAst(text)
  if (errors.length > 0) return { ok: false, errors }
  if (!value) return { ok: true, text }

  const byName = nameOrder(sort, order)
  const leading = new Set([...first].map(localName))
  const ordered = byName !== null || leading.size > 0
  const lead = (name: string) => Number(leading.has(localName(name)))
  const compare = (a: string, b: string) =>
    lead(b) - lead(a) || (byName?.(a, b) ?? 0)

  // Keeps one blank line where the source had any, unless asked not to.
  const gap = (before: number, at: number) =>
    !removeEmptyLines &&
    !ordered &&
    (text.slice(before, at).match(/\n/g)?.length ?? 0) > 1

  const write = (node: JsonValue, depth: number): string => {
    if (node.type !== 'object' && node.type !== 'array') return node.raw
    const pad = indent.repeat(depth + 1)
    const entries =
      node.type === 'object'
        ? node.members.map((member) => ({
            from: member.from,
            to: member.to,
            name: member.key,
            text: `${text.slice(member.keyFrom, member.keyTo)}: ${write(member.value!, depth + 1)}`,
          }))
        : node.items.map((item) => ({
            from: item.from,
            to: item.to,
            name: null,
            text: write(item, depth + 1),
          }))
    if (entries.length === 0) return node.type === 'object' ? '{}' : '[]'
    if (node.type === 'object' && ordered) {
      entries.sort((a, b) => compare(a.name!, b.name!))
    }
    const lines = entries.map(
      (entry, i) =>
        (i > 0 && gap(entries[i - 1].to, entry.from) ? '\n' : '') +
        pad +
        entry.text,
    )
    const [open, close] = node.type === 'object' ? ['{', '}'] : ['[', ']']
    return `${open}\n${lines.join(',\n')}\n${indent.repeat(depth)}${close}`
  }

  let out = write(value, 0) + '\n'
  if (trimVars) out = out.replace(varRegExp(), trimVar)
  return { ok: true, text: out }
}
