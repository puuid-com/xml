// Structured edits from the tree for JSON documents, as minimal text changes
// (see `#/lib/xml/edit`).

import { lineIndent, removeNode } from '#/lib/xml/edit'
import { childElements } from '#/lib/xml/model'
import { VAR_PATTERN } from '#/lib/xml/vars'
import type { TextChange } from '#/lib/xml/edit'
import type { JsonType, XmlElement } from '#/lib/xml/model'

const LITERAL_RE = new RegExp(
  `^(?:-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?|true|false|null|${VAR_PATTERN})$`,
)

/**
 * The JSON for a value typed in the tree. Strings stay strings; other values
 * keep their type when the text is still a number, `true`, `false`, `null`
 * or a `<<var>>`, and become strings otherwise.
 */
export function jsonLiteral(value: string, type: JsonType) {
  const trimmed = value.trim()
  if (type !== 'string' && LITERAL_RE.test(trimmed)) return trimmed
  return JSON.stringify(value)
}

export function setJsonValue(el: XmlElement, value: string): Array<TextChange> {
  const info = el.json
  if (!info || info.type === 'object' || info.type === 'array') return []
  return [
    {
      from: info.valueFrom,
      to: info.valueTo,
      insert: jsonLiteral(value, info.type),
    },
  ]
}

/**
 * Appends an entry to an object (`"name": ""`, made unique) or an array
 * (`""`), on its own line when the container spans several lines.
 */
export function addJsonChild(
  text: string,
  el: XmlElement,
  name: string,
): Array<TextChange> {
  const info = el.json
  if (!info || info.close === null) return []
  if (info.type !== 'object' && info.type !== 'array') return []
  const kids = childElements(el)
  const entry =
    info.type === 'object'
      ? `${JSON.stringify(uniqueKey(name, kids))}: ""`
      : '""'
  const last = kids.at(-1)
  if (!last) {
    const indent = lineIndent(text, el.from)
    return [
      {
        from: info.valueFrom + 1,
        to: info.close,
        insert: `\n${indent}${detectJsonIndentUnit(text)}${entry}\n${indent}`,
      },
    ]
  }
  const multiline = text.slice(info.valueFrom, info.close).includes('\n')
  const insert = multiline
    ? `,\n${lineIndent(text, last.from)}${entry}`
    : `, ${entry}`
  return [{ from: last.to, to: last.to, insert }]
}

function uniqueKey(name: string, siblings: Array<XmlElement>) {
  const taken = new Set(siblings.map((s) => s.name))
  if (!taken.has(name)) return name
  for (let i = 2; ; i++) {
    if (!taken.has(`${name}${i}`)) return `${name}${i}`
  }
}

/** Removes an entry and the comma that separates it from its neighbours. */
export function removeJsonNode(
  text: string,
  el: XmlElement,
  siblings: Array<XmlElement>,
): Array<TextChange> {
  const index = siblings.findIndex((s) => s.path === el.path)
  if (index < 0 || siblings.length === 1) return removeNode(text, el)
  const next = siblings.at(index + 1)
  if (next) {
    const from = lineStart(text, el.from)
    const to = lineStart(text, next.from)
    return from !== null && to !== null
      ? [{ from, to, insert: '' }]
      : [{ from: el.from, to: next.from, insert: '' }]
  }
  return [{ from: siblings[index - 1].to, to: el.to, insert: '' }]
}

/** Start of the line when only indentation comes before `pos`, else `null`. */
function lineStart(text: string, pos: number) {
  let at = pos
  while (at > 0 && /[ \t]/.test(text[at - 1])) at--
  return at === 0 || text[at - 1] === '\n' ? at : null
}

export function detectJsonIndentUnit(text: string) {
  const match = /\n([ \t]+)\S/.exec(text)
  if (!match) return '  '
  return match[1].startsWith('\t') ? '\t' : match[1]
}
