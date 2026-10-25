// Positions are offsets into the document text (UTF-16 code units), matching
// CodeMirror's. `from` is inclusive, `to` exclusive.

export interface XmlAttr {
  name: string
  /** Raw source between the quotes, entities still encoded. */
  raw: string
  /** Decoded value for display and editing. */
  value: string
  from: number
  to: number
  nameFrom: number
  nameTo: number
  /** Inside the quotes. */
  valueFrom: number
  valueTo: number
  quote: '"' | "'"
}

export interface XmlElement {
  kind: 'element'
  /** Stable path such as `/root/item[2]`, used as the tree row id. */
  path: string
  name: string
  depth: number
  from: number
  to: number
  nameFrom: number
  nameTo: number
  /** Start of `>` or `/>` that ends the open tag. */
  openEndFrom: number
  /** End of the open tag. */
  openTo: number
  /** Start of the close tag, or `null` when self-closing or missing. */
  closeFrom: number | null
  closeNameFrom: number | null
  closeNameTo: number | null
  selfClosing: boolean
  attrs: Array<XmlAttr>
  children: Array<XmlNode>
}

export interface XmlText {
  kind: 'text'
  from: number
  to: number
  raw: string
  value: string
}

export interface XmlOther {
  kind: 'comment' | 'cdata' | 'pi' | 'doctype'
  from: number
  to: number
  raw: string
}

export type XmlNode = XmlElement | XmlText | XmlOther

export interface XmlError {
  from: number
  to: number
  message: string
}

export interface XmlDocument {
  nodes: Array<XmlNode>
  /** The first top-level element, if any. */
  root: XmlElement | null
  errors: Array<XmlError>
}

export function isElement(node: XmlNode): node is XmlElement {
  return node.kind === 'element'
}

export function childElements(el: XmlElement): Array<XmlElement> {
  return el.children.filter(isElement)
}

/** A leaf element has no child elements, so its text can be edited inline. */
export function isLeaf(el: XmlElement): boolean {
  return !el.children.some(isElement)
}

/** Decoded text content of a leaf element (text and CDATA). */
export function leafValue(el: XmlElement): string {
  let value = ''
  for (const child of el.children) {
    if (child.kind === 'text') value += child.value
    else if (child.kind === 'cdata') value += child.raw.slice(9, -3)
  }
  return value
}
