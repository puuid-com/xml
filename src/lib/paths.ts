// Standard paths to an element, for copying into other tools:
// - XML: an XPath 1.0 location path in abbreviated syntax (W3C XPath 1.0 §2.5).
// - JSON: a JSON Pointer (RFC 6901) and a JSONPath query (RFC 9535).

import { isElement } from './xml/model'
import type { XmlElement, XmlNode } from './xml/model'

export type PathFormat = 'xpath' | 'json-pointer' | 'jsonpath'

/** The formats that apply to an element, preferred first. */
export function pathFormats(el: XmlElement): Array<PathFormat> {
  return el.json ? ['jsonpath', 'json-pointer'] : ['xpath']
}

export function formatPath(
  nodes: Array<XmlNode>,
  el: XmlElement,
  format: PathFormat,
): string {
  const steps = lineage(nodes, el.path)
  switch (format) {
    case 'xpath':
      return xpath(steps)
    case 'json-pointer':
      return jsonPointer(steps)
    case 'jsonpath':
      return jsonPath(steps)
  }
}

interface Step {
  el: XmlElement
  siblings: Array<XmlElement>
}

/** Each element from the top level down to `path`, with its siblings. */
function lineage(nodes: Array<XmlNode>, path: string): Array<Step> {
  const steps: Array<Step> = []
  let level = nodes
  for (;;) {
    const siblings = level.filter(isElement)
    const hit = siblings.find(
      (node) => node.path === path || path.startsWith(node.path + '/'),
    )
    if (!hit) return steps
    steps.push({ el: hit, siblings })
    if (hit.path === path) return steps
    level = hit.children
  }
}

/**
 * `/root/item[2]/name`. The position is only added when siblings share the
 * name, like browser dev tools do. An unprefixed name in a default namespace
 * matches nothing in XPath 1.0, so it is selected by `local-name()` instead.
 */
function xpath(steps: Array<Step>) {
  let defaultNs = ''
  return steps
    .map(({ el, siblings }) => {
      const xmlns = el.attrs.find((attr) => attr.name === 'xmlns')
      if (xmlns) defaultNs = xmlns.value
      let step =
        defaultNs && !el.name.includes(':')
          ? `*[local-name()='${el.name}']`
          : el.name
      const same = siblings.filter((s) => s.name === el.name)
      if (same.length > 1) step += `[${same.indexOf(el) + 1}]`
      return '/' + step
    })
    .join('')
}

/** `/root/0/name`, with `~` and `/` escaped as `~0` and `~1`. */
function jsonPointer(steps: Array<Step>) {
  return steps
    .map(({ el }) => '/' + el.name.replaceAll('~', '~0').replaceAll('/', '~1'))
    .join('')
}

// RFC 9535 member-name-shorthand: name-first *name-char.
const SHORTHAND =
  /^[A-Za-z_\u{80}-\u{D7FF}\u{E000}-\u{10FFFF}][\w\u{80}-\u{D7FF}\u{E000}-\u{10FFFF}]*$/u

/** `$.root[0].name`, with `['…']` for keys the shorthand can't hold. */
function jsonPath(steps: Array<Step>) {
  let out = '$'
  for (const { el } of steps) {
    if (el.json?.item) out += `[${el.name}]`
    else if (SHORTHAND.test(el.name)) out += `.${el.name}`
    else out += `['${escapeJsonPathString(el.name)}']`
  }
  return out
}

const JSONPATH_ESCAPES: Record<string, string> = {
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  "'": "\\'",
  '\\': '\\\\',
}

/** Escapes a single-quoted string the way RFC 9535 normalized paths do. */
function escapeJsonPathString(value: string) {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f'\\]/g, (char) => {
    return (
      JSONPATH_ESCAPES[char] ??
      `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`
    )
  })
}
