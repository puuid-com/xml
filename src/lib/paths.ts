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
 * `/root/item[2]/name`. Positions count siblings with the same expanded name.
 * Namespaced elements use their URI so the path needs no namespace resolver,
 * including when a prefix is rebound or several prefixes name the same URI.
 */
function xpath(steps: Array<Step>) {
  const namespaces = new Map([['xml', 'http://www.w3.org/XML/1998/namespace']])
  return steps
    .map(({ el, siblings }) => {
      const name = localName(el)
      const namespace = namespaceOf(el, namespaces)
      const same = siblings.filter(
        (s) =>
          localName(s) === name && namespaceOf(s, namespaces) === namespace,
      )
      let step = namespace
        ? `*[local-name()='${name}' and namespace-uri()=${xpathString(namespace)}]`
        : el.name
      if (same.length > 1) step += `[${same.indexOf(el) + 1}]`

      for (const attr of el.attrs) {
        if (attr.name === 'xmlns') namespaces.set('', attr.value)
        else if (attr.name.startsWith('xmlns:')) {
          namespaces.set(attr.name.slice(6), attr.value)
        }
      }
      return '/' + step
    })
    .join('')
}

function localName(el: XmlElement) {
  return el.name.slice(el.name.indexOf(':') + 1)
}

function namespaceOf(el: XmlElement, inherited: ReadonlyMap<string, string>) {
  const colon = el.name.indexOf(':')
  const prefix = colon < 0 ? '' : el.name.slice(0, colon)
  const declaration = prefix ? `xmlns:${prefix}` : 'xmlns'
  return (
    el.attrs.find((attr) => attr.name === declaration)?.value ??
    inherited.get(prefix) ??
    ''
  )
}

/** XPath 1.0 strings have no backslash escapes. */
function xpathString(value: string) {
  if (!value.includes("'")) return `'${value}'`
  if (!value.includes('"')) return `"${value}"`
  return `concat(${value
    .split("'")
    .map((part) => `'${part}'`)
    .join(`, "'", `)})`
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
