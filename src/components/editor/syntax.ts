import { syntaxTree } from '@codemirror/language'

import { decodeString } from '#/lib/json/parse'
import type { EditorState, Text } from '@codemirror/state'
import type { ViewUpdate } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'

// Reading tag names and JSON keys off the CodeMirror syntax tree.

const TAG_NODES = new Set(['OpenTag', 'CloseTag', 'SelfClosingTag'])

const TAG_BRACKETS = new Set([
  'StartTag',
  'StartCloseTag',
  'EndTag',
  'SelfCloseEndTag',
])

export interface NamedTag {
  name: string
  /** The whole tag, or the quoted JSON key. */
  from: number
  to: number
  /** Ranges drawn in the highlight colour: the name and its brackets. */
  inks: Array<{ from: number; to: number }>
  /** An opening tag or a JSON key, where an element starts. */
  opens: boolean
}

function keyName(doc: Text, node: SyntaxNode) {
  return decodeString(doc.sliceString(node.from, node.to))
}

/** The XML tag or JSON key a syntax node names, if it is one. */
export function namedTag(node: SyntaxNode, doc: Text): NamedTag | null {
  if (node.name === 'PropertyName') {
    return {
      name: keyName(doc, node),
      from: node.from,
      to: node.to,
      inks: [{ from: node.from, to: node.to }],
      opens: true,
    }
  }
  if (node.name !== 'TagName') return null
  const tag = node.parent
  if (!tag || !TAG_NODES.has(tag.name)) return null
  const inks = [{ from: node.from, to: node.to }]
  for (let child = tag.firstChild; child; child = child.nextSibling) {
    if (TAG_BRACKETS.has(child.name) && child.to > child.from) {
      inks.push({ from: child.from, to: child.to })
    }
  }
  return {
    name: doc.sliceString(node.from, node.to),
    from: tag.from,
    to: tag.to,
    inks,
    opens: tag.name !== 'CloseTag',
  }
}

/** Whether a tag name or JSON key opens an element that holds other elements. */
export function namesParent(node: SyntaxNode): boolean {
  if (node.name === 'PropertyName') {
    const value = node.nextSibling?.nextSibling
    return value?.name === 'Object' || value?.name === 'Array'
  }
  if (node.name !== 'TagName') return false
  const tag = node.parent
  if (tag?.name !== 'OpenTag' && tag?.name !== 'CloseTag') return false
  return tag.parent?.getChild('Element') != null
}

/** The tag name or JSON key right at `pos`, on either side of it. */
export function tagNameNear(state: EditorState, pos: number) {
  const tree = syntaxTree(state)
  for (const side of [-1, 1] as const) {
    const node = tree.resolveInner(pos, side)
    const tag = namedTag(node, state.doc)
    if (tag) return { name: tag.name, at: node.from }
  }
  return null
}

/**
 * Name of the tag (`<a …>`, `</a>`, `<a/>`) or JSON key that contains `pos`,
 * if any.
 */
export function tagAt(state: EditorState, pos: number) {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, 1)
  for (; node; node = node.parent) {
    if (node.name === 'PropertyName') return keyName(state.doc, node)
    if (!TAG_NODES.has(node.name)) continue
    const name = node.getChild('TagName')
    return name ? state.sliceDoc(name.from, name.to) : null
  }
  return null
}

/** Whether an update re-parsed the document, so syntax-based marks are stale. */
export function treeChanged(update: ViewUpdate) {
  return syntaxTree(update.startState) !== syntaxTree(update.state)
}
