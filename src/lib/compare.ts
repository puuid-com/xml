import { formatDocument, languageOf } from './document'
import { Change, diff } from '@codemirror/merge'
import type { DiffConfig } from '@codemirror/merge'
import type { FormatOptions } from './xml/format'

export interface CompareSide {
  name: string
  content: string
}

export interface CompareTexts {
  a: string
  b: string
  /** Whether both sides were formatted before diffing. */
  formatted: boolean
  /** Name of the first file that doesn't parse, when formatting was asked for. */
  unparsed: string | null
}

// Distinct lines a single UTF-16 code unit can stand for, skipping surrogates.
const MAX_TOKENS = 0x10000 - 0x800

function tokenChar(index: number) {
  return String.fromCharCode(index < 0xd800 ? index : index + 0x800)
}

function splitLines(text: string) {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? []
}

/** Start offset of each line, plus the text length at the end. */
function lineStarts(lines: ReadonlyArray<string>) {
  const starts = [0]
  for (const line of lines) starts.push(starts.at(-1)! + line.length)
  return starts
}

// Changed stretches up to this many characters get a character-level diff,
// within an overall budget so a file that changed everywhere stays fast.
const REFINE_MAX = 4000
const REFINE_BUDGET = 400_000

/**
 * Diffs line by line, then character by character inside small changed
 * stretches. The stock character diff either stalls for seconds on large,
 * very different files or, with its scan limit, merges a few far-apart edits
 * into one huge change.
 */
export function lineDiff(a: string, b: string): ReadonlyArray<Change> {
  const linesA = splitLines(a)
  const linesB = splitLines(b)
  const tokens = new Map<string, string>()
  const encode = (lines: ReadonlyArray<string>) => {
    let out = ''
    for (const line of lines) {
      let token = tokens.get(line)
      if (token === undefined) {
        token = tokenChar(tokens.size)
        tokens.set(line, token)
      }
      out += token
    }
    return out
  }
  const tokA = encode(linesA)
  const tokB = encode(linesB)
  if (tokens.size > MAX_TOKENS) return diff(a, b, { scanLimit: 500 })

  const startsA = lineStarts(linesA)
  const startsB = lineStarts(linesB)
  let budget = REFINE_BUDGET
  const changes: Array<Change> = []
  for (const line of diff(tokA, tokB, { timeout: 100 })) {
    const fromA = startsA[line.fromA]
    const toA = startsA[line.toA]
    const fromB = startsB[line.fromB]
    const toB = startsB[line.toB]
    const size = toA - fromA + (toB - fromB)
    if (toA === fromA || toB === fromB || size > REFINE_MAX || size > budget) {
      changes.push(new Change(fromA, toA, fromB, toB))
      continue
    }
    budget -= size
    for (const c of diff(a.slice(fromA, toA), b.slice(fromB, toB))) {
      changes.push(
        new Change(
          fromA + c.fromA,
          fromA + c.toA,
          fromB + c.fromB,
          fromB + c.toB,
        ),
      )
    }
  }
  return changes
}

/** Diff settings for the compare view. */
export const DIFF_CONFIG: DiffConfig = { override: lineDiff }

/**
 * The two texts to diff. With `ignoreFormatting`, both sides are formatted
 * with the same options first, so only differences in the data remain; when
 * either side doesn't parse, both stay as written.
 */
export function compareTexts(
  a: CompareSide,
  b: CompareSide,
  ignoreFormatting: boolean,
  options: FormatOptions,
): CompareTexts {
  const raw = { a: a.content, b: b.content, formatted: false, unparsed: null }
  if (!ignoreFormatting) return raw
  const left = formatDocument(a.content, languageOf(a.name, a.content), options)
  if (!left.ok) return { ...raw, unparsed: a.name }
  const right = formatDocument(
    b.content,
    languageOf(b.name, b.content),
    options,
  )
  if (!right.ok) return { ...raw, unparsed: b.name }
  return { a: left.text, b: right.text, formatted: true, unparsed: null }
}
