import { parser } from '@lezer/xml'

import { decodeEntities } from './entities'
import { maskVars } from './vars'
import type { SyntaxNode } from '@lezer/common'
import type {
  XmlAttr,
  XmlDocument,
  XmlElement,
  XmlError,
  XmlNode,
  XmlText,
} from './model'

const PREDEFINED = new Set(['lt', 'gt', 'amp', 'quot', 'apos'])

/**
 * Parses XML into a position-annotated model. Error tolerant: it always returns
 * a tree, plus the problems found. `<<var>>` placeholders are allowed anywhere
 * text or attribute values are.
 */
export function parseXml(text: string): XmlDocument {
  if (text.trim() === '') {
    return { language: 'xml', nodes: [], root: null, errors: [] }
  }

  const masked = maskVars(text)
  const tree = parser.parse(masked)
  const errors: Array<XmlError> = []
  const hasDoctype = /<!DOCTYPE/i.test(masked)

  tree.iterate({
    enter(ref) {
      if (ref.type.isError) {
        errors.push({
          from: ref.from,
          to: Math.max(ref.to, ref.from + 1),
          message: 'Unexpected input',
        })
      } else if (ref.name === 'MismatchedCloseTag') {
        const name = ref.node.getChild('TagName')
        const label = name ? text.slice(name.from, name.to) : ''
        errors.push({
          from: ref.from,
          to: ref.to,
          message: `Closing tag </${label}> does not match an open element`,
        })
      } else if (ref.name === 'EntityReference' && !hasDoctype) {
        const entity = text.slice(ref.from + 1, ref.to - 1)
        if (!PREDEFINED.has(entity)) {
          errors.push({
            from: ref.from,
            to: ref.to,
            message: `Unknown entity &${entity};`,
          })
        }
      }
    },
  })

  const build = new Builder(text, errors)
  const nodes = build.children(tree.topNode.firstChild, null, '', 0)

  let root: XmlElement | null = null
  for (const node of nodes) {
    if (node.kind === 'element') {
      if (root) {
        errors.push({
          from: node.nameFrom,
          to: node.nameTo,
          message: 'Only one root element is allowed',
        })
      } else {
        root = node
      }
    } else if (node.kind === 'text' && node.raw.trim() !== '') {
      errors.push({
        from: node.from,
        to: node.to,
        message: 'Text is not allowed outside the root element',
      })
    }
  }

  errors.sort((a, b) => a.from - b.from)
  return { language: 'xml', nodes, root, errors: dedupe(errors) }
}

export function dedupe(errors: Array<XmlError>) {
  return errors.filter(
    (error, i) =>
      i === 0 ||
      error.from !== errors[i - 1].from ||
      error.message !== errors[i - 1].message,
  )
}

class Builder {
  constructor(
    private text: string,
    private errors: Array<XmlError>,
  ) {}

  /** Builds sibling nodes starting at `first`, stopping at `stop`. */
  children(
    first: SyntaxNode | null,
    stop: SyntaxNode | null,
    parentPath: string,
    depth: number,
  ): Array<XmlNode> {
    const out: Array<XmlNode> = []
    const counts = new Map<string, number>()
    let pendingText: { from: number; to: number } | null = null

    const flushText = () => {
      if (!pendingText) return
      const raw = this.text.slice(pendingText.from, pendingText.to)
      const node: XmlText = {
        kind: 'text',
        from: pendingText.from,
        to: pendingText.to,
        raw,
        value: decodeEntities(raw),
      }
      out.push(node)
      pendingText = null
    }

    for (let node = first; node && node !== stop; node = node.nextSibling) {
      switch (node.name) {
        case 'Text':
        case 'EntityReference':
        case 'CharacterReference':
          if (pendingText && pendingText.to === node.from) {
            pendingText.to = node.to
          } else {
            flushText()
            pendingText = { from: node.from, to: node.to }
          }
          continue
      }
      flushText()
      switch (node.name) {
        case 'Element': {
          const name = this.elementName(node)
          const index = (counts.get(name) ?? 0) + 1
          counts.set(name, index)
          out.push(this.element(node, `${parentPath}/${name}[${index}]`, depth))
          break
        }
        case 'Comment':
          out.push(this.other('comment', node))
          break
        case 'Cdata':
          out.push(this.other('cdata', node))
          break
        case 'ProcessingInst':
          out.push(this.other('pi', node))
          break
        case 'DoctypeDecl':
          out.push(this.other('doctype', node))
          break
      }
    }
    flushText()
    return out
  }

  private elementName(node: SyntaxNode) {
    const tag = node.firstChild?.getChild('TagName')
    return tag ? this.text.slice(tag.from, tag.to) : ''
  }

  private other(
    kind: 'comment' | 'cdata' | 'pi' | 'doctype',
    node: SyntaxNode,
  ) {
    return {
      kind,
      from: node.from,
      to: node.to,
      raw: this.text.slice(node.from, node.to),
    }
  }

  private element(node: SyntaxNode, path: string, depth: number): XmlElement {
    const open = node.firstChild!
    const tag = open.getChild('TagName')
    const nameFrom = tag?.from ?? open.from
    const nameTo = tag?.to ?? open.from
    const selfClosing = open.name === 'SelfClosingTag'
    const openEnd =
      open.getChild('EndTag') ?? open.getChild('SelfCloseEndTag') ?? null
    const close = node.getChild('CloseTag')
    const closeName = close?.getChild('TagName') ?? null
    const name = this.text.slice(nameFrom, nameTo)

    if (node.getChild('MissingCloseTag')) {
      this.errors.push({
        from: nameFrom,
        to: nameTo,
        message: `<${name}> is not closed`,
      })
    }

    return {
      kind: 'element',
      path,
      name,
      depth,
      from: node.from,
      to: node.to,
      nameFrom,
      nameTo,
      openEndFrom: openEnd?.from ?? open.to,
      openTo: open.to,
      closeFrom: close?.from ?? null,
      closeNameFrom: closeName?.from ?? null,
      closeNameTo: closeName?.to ?? null,
      selfClosing,
      attrs: this.attrs(open),
      children: selfClosing
        ? []
        : this.children(open.nextSibling, close, path, depth + 1),
    }
  }

  private attrs(open: SyntaxNode): Array<XmlAttr> {
    const attrs: Array<XmlAttr> = []
    const seen = new Set<string>()
    for (const attr of open.getChildren('Attribute')) {
      const nameNode = attr.getChild('AttributeName')
      const valueNode = attr.getChild('AttributeValue')
      if (!nameNode) continue
      const name = this.text.slice(nameNode.from, nameNode.to)
      if (seen.has(name)) {
        this.errors.push({
          from: nameNode.from,
          to: nameNode.to,
          message: `Duplicate attribute "${name}"`,
        })
      }
      seen.add(name)

      let valueFrom = attr.to
      let valueTo = attr.to
      let quote: '"' | "'" = '"'
      if (valueNode) {
        const first = this.text[valueNode.from]
        quote = first === "'" ? "'" : '"'
        valueFrom = valueNode.from + 1
        const last = this.text[valueNode.to - 1]
        valueTo =
          valueNode.to - valueNode.from >= 2 && last === quote
            ? valueNode.to - 1
            : valueNode.to
      }
      const raw = this.text.slice(valueFrom, valueTo)
      attrs.push({
        name,
        raw,
        value: decodeEntities(raw),
        from: attr.from,
        to: attr.to,
        nameFrom: nameNode.from,
        nameTo: nameNode.to,
        valueFrom,
        valueTo,
        quote,
      })
    }
    return attrs
  }
}
