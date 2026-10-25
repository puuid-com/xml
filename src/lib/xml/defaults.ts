// Default values: rules that set every matching element's text, or every
// matching attribute, to a stored value. A key `name` targets leaf elements
// named `name`; `@name` targets attributes named `name` on any element.

import { setAttr, setText } from './edit'
import { isLeaf, leafValue } from './model'
import { allElements } from './locate'
import type { TextChange } from './edit'
import type { XmlNode } from './model'

export interface DefaultRule {
  key: string
  value: string
}

export function isAttrKey(key: string) {
  return key.startsWith('@')
}

/**
 * Changes that apply `rules` to the document. Values already in place are
 * skipped, so the result is empty when nothing would change. The changes
 * never overlap and all refer to the original text.
 */
export function defaultChanges(
  nodes: Array<XmlNode>,
  rules: ReadonlyArray<DefaultRule>,
): Array<TextChange> {
  const elementRules = new Map<string, string>()
  const attrRules = new Map<string, string>()
  for (const rule of rules) {
    if (isAttrKey(rule.key)) attrRules.set(rule.key.slice(1), rule.value)
    else elementRules.set(rule.key, rule.value)
  }

  const changes: Array<TextChange> = []
  for (const el of allElements(nodes)) {
    for (const attr of el.attrs) {
      const value = attrRules.get(attr.name)
      if (value !== undefined && attr.value !== value) {
        changes.push(...setAttr(attr, value))
      }
    }
    const value = elementRules.get(el.name)
    if (value !== undefined && isLeaf(el) && leafValue(el) !== value) {
      changes.push(...setText(el, value))
    }
  }
  return changes
}

/** Element names and `@attribute` names in the document, sorted. */
export function defaultKeys(nodes: Array<XmlNode>): Array<string> {
  const keys = new Set<string>()
  for (const el of allElements(nodes)) {
    if (isLeaf(el)) keys.add(el.name)
    for (const attr of el.attrs) keys.add(`@${attr.name}`)
  }
  return [...keys].sort()
}
