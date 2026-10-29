// Guesses which profile a file belongs to from its structure alone: tag
// names with their prefixes, which tags nest in which, attribute names and
// declared namespace prefixes. Values, text and namespace URIs are ignored,
// so two files of one kind match whatever data they carry, and files that
// differ only by the prefixes on their tags tell apart.

import { languageOf, parseDocument } from './document'
import { childElements, hasName } from './xml/model'
import type { XmlElement } from './xml/model'

/** Distinct structural features of a document, sorted. */
export type Fingerprint = Array<string>

// How much a shared feature counts. The root and the prefixes say the most
// about the kind of file; single tags and nestings the least, being many.
const WEIGHTS: Record<string, number> = {
  root: 4,
  prefix: 3,
  xmlns: 3,
  tag: 1,
  nest: 1,
  attr: 1,
}

/** Lowest score that counts as a match. */
export const MIN_SCORE = 0.35
/** How far the best profile has to lead the next one to be picked. */
export const MIN_LEAD = 0.1

function prefixOf(name: string) {
  const colon = name.indexOf(':')
  return colon > 0 ? name.slice(0, colon) : null
}

export function fingerprint(name: string, content: string): Fingerprint {
  const doc = parseDocument(content, languageOf(name, content))
  const features = new Set<string>()
  // Array items are named by their index, which says nothing of the shape.
  const nameOf = (el: XmlElement) => (hasName(el) ? el.name : '[]')

  const visit = (el: XmlElement, parent: string) => {
    const tag = nameOf(el)
    features.add(`tag:${tag}`)
    features.add(`nest:${parent}>${tag}`)
    const prefix = prefixOf(tag)
    if (prefix) features.add(`prefix:${prefix}`)
    for (const attr of el.attrs) {
      if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) {
        features.add(`xmlns:${attr.name}`)
        continue
      }
      features.add(`attr:${tag}@${attr.name}`)
      const attrPrefix = prefixOf(attr.name)
      if (attrPrefix) features.add(`prefix:${attrPrefix}`)
    }
    for (const child of childElements(el)) visit(child, tag)
  }

  if (doc.language === 'json') {
    const top = doc.nodes.filter((node) => node.kind === 'element')
    if (top.length) features.add(`root:${top[0].json?.item ? '[]' : '{}'}`)
    for (const el of top) visit(el, '')
  } else if (doc.root) {
    features.add(`root:${doc.root.name}`)
    visit(doc.root, '')
  }
  return [...features].sort()
}

function weight(feature: string) {
  return WEIGHTS[feature.slice(0, feature.indexOf(':'))] ?? 1
}

/** Weighted Jaccard similarity of two fingerprints, from 0 to 1. */
export function similarity(a: Fingerprint, b: Fingerprint) {
  const other = new Set(b)
  let shared = 0
  let total = 0
  for (const feature of a) {
    const w = weight(feature)
    total += w
    if (other.delete(feature)) shared += w
  }
  for (const feature of other) total += weight(feature)
  return total === 0 ? 0 : shared / total
}

export interface ProfileSamples {
  id: string
  samples: ReadonlyArray<Fingerprint>
}

/**
 * The profile whose closest sample is most like `print`, or null when none
 * is close enough or two profiles are about as close.
 */
export function bestProfile(
  print: Fingerprint,
  candidates: ReadonlyArray<ProfileSamples>,
): string | null {
  if (print.length === 0) return null
  const scores = candidates
    .map(({ id, samples }) => ({
      id,
      score: Math.max(0, ...samples.map((s) => similarity(print, s))),
    }))
    .sort((a, b) => b.score - a.score)
  const best = scores.at(0)
  const next = scores.at(1)
  if (!best || best.score < MIN_SCORE) return null
  if (next && best.score - next.score < MIN_LEAD) return null
  return best.id
}

/** Whether two fingerprints hold the same features. */
export function samePrint(a: Fingerprint, b: Fingerprint) {
  return a.length === b.length && a.every((feature, i) => feature === b[i])
}
