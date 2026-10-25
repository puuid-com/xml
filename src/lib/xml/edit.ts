// Turns structured edits from the tree into minimal text changes, so the
// document keeps its formatting and every edit is one undoable transaction.
// Changes are compatible with CodeMirror's `ChangeSpec`.

import { escapeAttr, escapeText } from './entities'
import type { XmlAttr, XmlElement } from './model'

export interface TextChange {
  from: number
  to: number
  insert: string
}

const NAME_RE = /^[A-Za-z_:][\w.:-]*$/

function isValidName(name: string) {
  return NAME_RE.test(name)
}

export function setText(el: XmlElement, value: string): Array<TextChange> {
  const onlyChild = el.children.length === 1 ? el.children[0] : null
  if (onlyChild?.kind === 'cdata') {
    return [
      {
        from: onlyChild.from + 9,
        to: onlyChild.to - 3,
        insert: value.replaceAll(']]>', ']]]]><![CDATA[>'),
      },
    ]
  }
  if (el.selfClosing) {
    if (value === '') return []
    return [
      {
        from: openTagContentEnd(el),
        to: el.to,
        insert: `>${escapeText(value)}</${el.name}>`,
      },
    ]
  }
  if (el.closeFrom === null) return []
  return [{ from: el.openTo, to: el.closeFrom, insert: escapeText(value) }]
}

export function setAttr(attr: XmlAttr, value: string): Array<TextChange> {
  return [
    {
      from: attr.valueFrom,
      to: attr.valueTo,
      insert: escapeAttr(value, attr.quote),
    },
  ]
}

/**
 * Appends `<name></name>` as the last child, indented one level deeper than
 * the parent's line.
 */
export function addChild(
  text: string,
  el: XmlElement,
  name: string,
): Array<TextChange> {
  if (!isValidName(name)) return []
  const indent = lineIndent(text, el.from)
  const unit = detectIndentUnit(text)
  const child = `<${name}></${name}>`
  if (el.selfClosing) {
    return [
      {
        from: openTagContentEnd(el),
        to: el.to,
        insert: `>\n${indent}${unit}${child}\n${indent}</${el.name}>`,
      },
    ]
  }
  if (el.closeFrom === null) return []
  // Insert before the whitespace that precedes the close tag.
  let at = el.closeFrom
  while (at > el.openTo && /[ \t]/.test(text[at - 1])) at--
  const beforeNewline = at > el.openTo && text[at - 1] === '\n'
  if (beforeNewline) {
    return [{ from: at, to: at, insert: `${indent}${unit}${child}\n` }]
  }
  return [
    {
      from: el.closeFrom,
      to: el.closeFrom,
      insert: `\n${indent}${unit}${child}\n${indent}`,
    },
  ]
}

/** Removes a node; drops its whole line when nothing else is on it. */
export function removeNode(
  text: string,
  node: { from: number; to: number },
): Array<TextChange> {
  let from = node.from
  let to = node.to
  let lineStart = from
  while (lineStart > 0 && /[ \t]/.test(text[lineStart - 1])) lineStart--
  let lineEnd = to
  while (lineEnd < text.length && /[ \t]/.test(text[lineEnd])) lineEnd++
  const startsLine = lineStart === 0 || text[lineStart - 1] === '\n'
  const endsLine = lineEnd === text.length || text[lineEnd] === '\n'
  if (startsLine && endsLine) {
    from = lineStart
    to = lineEnd < text.length ? lineEnd + 1 : lineEnd
  }
  return [{ from, to, insert: '' }]
}

/** End of the last name or attribute, so `<a />` becomes `<a>` not `<a >`. */
function openTagContentEnd(el: XmlElement) {
  return el.attrs.length > 0 ? el.attrs[el.attrs.length - 1].to : el.nameTo
}

export function lineIndent(text: string, pos: number) {
  const start = text.lastIndexOf('\n', pos - 1) + 1
  return /^[ \t]*/.exec(text.slice(start, pos))?.[0] ?? ''
}

export function detectIndentUnit(text: string) {
  const match = /\n([ \t]+)</.exec(text)
  if (!match) return '  '
  return match[1].startsWith('\t') ? '\t' : match[1]
}

/** Smallest single change turning `before` into `after`, or `null` if equal. */
export function diffChange(before: string, after: string): TextChange | null {
  if (before === after) return null
  let start = 0
  const max = Math.min(before.length, after.length)
  while (start < max && before[start] === after[start]) start++
  let endBefore = before.length
  let endAfter = after.length
  while (
    endBefore > start &&
    endAfter > start &&
    before[endBefore - 1] === after[endAfter - 1]
  ) {
    endBefore--
    endAfter--
  }
  return {
    from: start,
    to: endBefore,
    insert: after.slice(start, endAfter),
  }
}
