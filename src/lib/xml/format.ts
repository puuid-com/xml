import { parseXml } from './parse'
import type { XmlAttr, XmlElement, XmlError, XmlNode } from './model'

export type FormatResult =
  { ok: true; text: string } | { ok: false; errors: Array<XmlError> }

export interface FormatOptions {
  indent?: string
}

/**
 * Pretty-prints XML. Elements holding only other elements are indented one per
 * line; anything with text (including mixed content) is kept exactly as written
 * so whitespace that matters is never touched. Refuses documents with errors.
 */
export function formatXml(
  text: string,
  { indent = '  ' }: FormatOptions = {},
): FormatResult {
  return serialize(text, indent)
}

/** Removes whitespace between elements. Text content is kept as written. */
export function minifyXml(text: string): FormatResult {
  return serialize(text, null)
}

function serialize(text: string, indent: string | null): FormatResult {
  const doc = parseXml(text)
  if (doc.errors.length > 0) return { ok: false, errors: doc.errors }

  const pretty = indent !== null
  const lines: Array<string> = []

  const write = (node: XmlNode, depth: number) => {
    const pad = pretty ? indent.repeat(depth) : ''
    if (node.kind === 'text') {
      if (node.raw.trim() !== '') lines.push(pad + node.raw.trim())
      return
    }
    if (node.kind !== 'element') {
      lines.push(pad + node.raw)
      return
    }
    const open = openTag(node)
    if (node.selfClosing) {
      lines.push(pad + open)
      return
    }
    const close = `</${node.name}>`
    if (node.children.length === 0) {
      lines.push(pad + open + close)
      return
    }
    if (hasText(node)) {
      const inner = text.slice(node.openTo, node.closeFrom ?? node.to)
      lines.push(pad + open + inner + close)
      return
    }
    lines.push(pad + open)
    for (const child of node.children) write(child, depth + 1)
    lines.push(pad + close)
  }

  for (const node of doc.nodes) write(node, 0)
  return {
    ok: true,
    text: pretty ? lines.join('\n') + '\n' : lines.join(''),
  }
}

function hasText(el: XmlElement) {
  return el.children.some(
    (child) =>
      (child.kind === 'text' && child.raw.trim() !== '') ||
      child.kind === 'cdata',
  )
}

function openTag(el: XmlElement) {
  const attrs = el.attrs.map(attrSource).join('')
  return `<${el.name}${attrs}${el.selfClosing ? ' />' : '>'}`
}

function attrSource(attr: XmlAttr) {
  return ` ${attr.name}=${attr.quote}${attr.raw}${attr.quote}`
}
