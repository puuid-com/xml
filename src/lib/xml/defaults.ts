// Default values: rules that set every matching element's text, or every
// matching attribute, to a stored value. A key `name` targets leaf elements
// named `name`; `@name` targets attributes named `name` on any element.

import { setAttr, setText } from './edit'
import { hasName, isLeaf, leafValue } from './model'
import { allElements } from './locate'
import type { TextChange } from './edit'
import type { XmlAttr, XmlElement, XmlNode } from './model'

export interface DefaultRule {
  key: string
  value: string
}

export function isAttrKey(key: string) {
  return key.startsWith('@')
}

/** Rules split by target, for looking values up by name. */
export interface DefaultIndex {
  elements: ReadonlyMap<string, string>
  attrs: ReadonlyMap<string, string>
}

export function defaultIndex(rules: ReadonlyArray<DefaultRule>): DefaultIndex {
  const elements = new Map<string, string>()
  const attrs = new Map<string, string>()
  for (const rule of rules) {
    if (isAttrKey(rule.key)) attrs.set(rule.key.slice(1), rule.value)
    else elements.set(rule.key, rule.value)
  }
  return { elements, attrs }
}

/** The default an element's value should have, if a rule covers it. */
export function leafDefault(index: DefaultIndex, el: XmlElement) {
  if (!hasName(el) || !isLeaf(el)) return undefined
  return index.elements.get(el.name)
}

/** Whether a leaf element's value equals its default. */
export function isDefaultLeaf(index: DefaultIndex, el: XmlElement) {
  const value = leafDefault(index, el)
  return value !== undefined && leafValue(el) === value
}

/** Whether an attribute's value equals its default. */
export function isDefaultAttr(index: DefaultIndex, attr: XmlAttr) {
  return index.attrs.get(attr.name) === attr.value
}

/** Whether a leaf element has a default its value doesn't equal. */
export function leafDiffers(index: DefaultIndex, el: XmlElement) {
  const value = leafDefault(index, el)
  return value !== undefined && leafValue(el) !== value
}

/** Whether an attribute has a default its value doesn't equal. */
export function attrDiffers(index: DefaultIndex, attr: XmlAttr) {
  const value = index.attrs.get(attr.name)
  return value !== undefined && attr.value !== value
}

/** A value a default rule would change. */
type DefaultTarget = { key: string; value: string } & (
  { attr: XmlAttr } | { el: XmlElement }
)

/** Values that `rules` cover and don't already equal, in document order. */
function* differingTargets(
  nodes: Array<XmlNode>,
  rules: ReadonlyArray<DefaultRule>,
): Generator<DefaultTarget> {
  const index = defaultIndex(rules)
  for (const el of allElements(nodes)) {
    for (const attr of el.attrs) {
      const value = index.attrs.get(attr.name)
      if (value !== undefined && attr.value !== value) {
        yield { key: `@${attr.name}`, value, attr }
      }
    }
    const value = leafDefault(index, el)
    if (value !== undefined && leafValue(el) !== value) {
      yield { key: el.name, value, el }
    }
  }
}

/**
 * Changes that apply `rules` to the document. Values already in place are
 * skipped, so the result is empty when nothing would change. The changes
 * never overlap and all refer to the original text.
 */
export function defaultChanges(
  nodes: Array<XmlNode>,
  rules: ReadonlyArray<DefaultRule>,
  setValue: (el: XmlElement, value: string) => Array<TextChange> = setText,
): Array<TextChange> {
  const changes: Array<TextChange> = []
  for (const target of differingTargets(nodes, rules)) {
    changes.push(
      ...('attr' in target
        ? setAttr(target.attr, target.value)
        : setValue(target.el, target.value)),
    )
  }
  return changes
}

export interface DefaultSummary extends DefaultRule {
  /** How many values the rule would change. */
  count: number
}

/** The rules that would change something, with how many values each sets. */
export function defaultSummary(
  nodes: Array<XmlNode>,
  rules: ReadonlyArray<DefaultRule>,
): Array<DefaultSummary> {
  const counts = new Map<string, number>()
  for (const { key } of differingTargets(nodes, rules)) {
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return rules.flatMap((rule) => {
    const count = counts.get(rule.key)
    return count ? [{ ...rule, count }] : []
  })
}

export interface DefaultMatch {
  /** The rule's key: a tag or key name, or `@name`. */
  key: string
  from: number
  to: number
  /** Whether the value differs from the default instead of equaling it. */
  differs: boolean
}

/**
 * Source ranges of values that a default rule covers, in document order,
 * flagged by whether they differ from the default. Empty values are left out
 * since there is nothing to mark.
 */
export function defaultMatches(
  nodes: Array<XmlNode>,
  rules: ReadonlyArray<DefaultRule>,
): Array<DefaultMatch> {
  const index = defaultIndex(rules)
  const matches: Array<DefaultMatch> = []
  for (const el of allElements(nodes)) {
    for (const attr of el.attrs) {
      const value = index.attrs.get(attr.name)
      if (value !== undefined && attr.valueTo > attr.valueFrom) {
        matches.push({
          key: `@${attr.name}`,
          from: attr.valueFrom,
          to: attr.valueTo,
          differs: attr.value !== value,
        })
      }
    }
    const value = leafDefault(index, el)
    if (value === undefined) continue
    const range = valueRange(el)
    if (range && range.to > range.from) {
      matches.push({ key: el.name, ...range, differs: leafValue(el) !== value })
    }
  }
  return matches
}

/** Where a leaf's value sits in the source, without JSON string quotes. */
function valueRange(el: XmlElement) {
  if (el.json) {
    const { type, valueFrom, valueTo } = el.json
    return type === 'string'
      ? { from: valueFrom + 1, to: valueTo - 1 }
      : { from: valueFrom, to: valueTo }
  }
  const first = el.children.at(0)
  const last = el.children.at(-1)
  return first && last ? { from: first.from, to: last.to } : null
}

/** Element names and `@attribute` names in the document, sorted. */
export function defaultKeys(nodes: Array<XmlNode>): Array<string> {
  const keys = new Set<string>()
  for (const el of allElements(nodes)) {
    if (hasName(el) && isLeaf(el)) keys.add(el.name)
    for (const attr of el.attrs) keys.add(`@${attr.name}`)
  }
  return [...keys].sort()
}
