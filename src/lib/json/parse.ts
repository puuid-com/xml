import { dedupe } from '#/lib/xml/parse'
import { encodeSegment } from '#/lib/xml/locate'
import { VAR_PATTERN } from '#/lib/xml/vars'
import type {
  JsonType,
  XmlDocument,
  XmlElement,
  XmlError,
  XmlNode,
} from '#/lib/xml/model'

export type JsonValue =
  | {
      type: 'object'
      from: number
      to: number
      members: Array<JsonMember>
      /** Position of the closing `}`, or `null` when missing. */
      close: number | null
    }
  | {
      type: 'array'
      from: number
      to: number
      items: Array<JsonValue>
      close: number | null
    }
  | {
      type: 'string' | 'number' | 'boolean' | 'null' | 'var'
      from: number
      to: number
      /** Source text of the value. */
      raw: string
      /** Decoded string, or the source for anything else. */
      value: string
    }

export interface JsonMember {
  key: string
  /** The key with its quotes. */
  keyFrom: number
  keyTo: number
  /** `null` when the value is missing. */
  value: JsonValue | null
  from: number
  to: number
}

export interface JsonAst {
  value: JsonValue | null
  errors: Array<XmlError>
}

const NUMBER_RE = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y
const WORD_RE = /[^\s,:[\]{}"]+/y
const VAR_RE = new RegExp(VAR_PATTERN, 'y')
const WHITESPACE = new Set([' ', '\t', '\n', '\r'])

/**
 * Parses JSON into values with positions. Error tolerant: it always returns
 * what it could read, plus the problems found. `<<var>>` and `{{var}}`
 * placeholders are allowed wherever a value is, and inside strings.
 */
export function parseJsonAst(text: string): JsonAst {
  if (text.trim() === '') return { value: null, errors: [] }
  const reader = new Reader(text)
  const value = reader.value()
  reader.skipSpace()
  if (value && reader.pos < text.length) {
    reader.error(reader.pos, text.length, 'Unexpected input after the value')
  }
  const errors = reader.errors.sort((a, b) => a.from - b.from)
  return { value, errors: dedupe(errors) }
}

/** Parses JSON into the shared element model used by the tree and editor. */
export function parseJson(text: string): XmlDocument {
  const { value, errors } = parseJsonAst(text)
  return {
    language: 'json',
    nodes: value ? childrenOf(value, '', 0) : [],
    root: null,
    errors,
  }
}

class Reader {
  pos = 0
  errors: Array<XmlError> = []

  constructor(private text: string) {}

  error(from: number, to: number, message: string) {
    this.errors.push({ from, to: Math.max(to, from + 1), message })
  }

  skipSpace() {
    while (WHITESPACE.has(this.text[this.pos])) this.pos++
  }

  value(): JsonValue | null {
    this.skipSpace()
    const start = this.pos
    const c = this.text[start] as string | undefined
    if (c === undefined) {
      this.error(Math.max(0, start - 1), start, 'Expected a value')
      return null
    }
    if (c === '<' || (c === '{' && this.text[start + 1] === '{')) {
      VAR_RE.lastIndex = start
      const match = VAR_RE.exec(this.text)
      if (match) return this.literal('var', start + match[0].length)
    }
    if (c === '{') return this.object()
    if (c === '[') return this.array()
    if (c === '"') return this.string()
    NUMBER_RE.lastIndex = start
    const number = NUMBER_RE.exec(this.text)
    WORD_RE.lastIndex = start
    const word = WORD_RE.exec(this.text)?.[0] ?? ''
    if (number && number[0].length === word.length) {
      return this.literal('number', start + word.length)
    }
    if (word === 'true' || word === 'false') {
      return this.literal('boolean', start + word.length)
    }
    if (word === 'null') return this.literal('null', start + word.length)
    if (word) {
      this.pos += word.length
      this.error(start, this.pos, `Unexpected "${word}"`)
      return null
    }
    this.error(start, start + 1, 'Expected a value')
    return null
  }

  private literal(type: 'number' | 'boolean' | 'null' | 'var', to: number) {
    const from = this.pos
    this.pos = to
    const raw = this.text.slice(from, to)
    return { type, from, to, raw, value: raw }
  }

  string(): JsonValue & { type: 'string' } {
    const from = this.pos
    let i = from + 1
    for (; i < this.text.length; i++) {
      const c = this.text[i]
      if (c === '"') break
      if (c === '\n') break
      if (c === '\\') {
        const next = this.text[i + 1] as string | undefined
        if (next === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(this.text.slice(i + 2, i + 6))) {
            this.error(i, i + 2, 'Invalid \\u escape')
          }
        } else if (!next || !'"\\/bfnrt'.includes(next)) {
          this.error(i, i + 2, `Invalid escape \\${next ?? ''}`)
        }
        i++
      } else if (c < ' ') {
        this.error(i, i + 1, 'Control characters must be escaped')
      }
    }
    if (this.text[i] !== '"') {
      this.error(from, i, 'String is not closed')
      this.pos = i
    } else {
      this.pos = i + 1
    }
    const raw = this.text.slice(from, this.pos)
    return { type: 'string', from, to: this.pos, raw, value: decodeString(raw) }
  }

  object(): JsonValue {
    const from = this.pos++
    const members: Array<JsonMember> = []
    const seen = new Set<string>()
    let close: number | null = null
    this.list('}', () => {
      if (this.text[this.pos] !== '"') {
        this.error(this.pos, this.pos + 1, 'Expected a property name')
        return false
      }
      const key = this.string()
      const name = key.value
      if (seen.has(name)) {
        this.error(key.from, key.to, `Duplicate key "${name}"`)
      }
      seen.add(name)
      this.skipSpace()
      let value: JsonValue | null = null
      if (this.text[this.pos] === ':') {
        this.pos++
        value = this.value()
      } else {
        this.error(key.to, key.to + 1, 'Expected ":"')
      }
      members.push({
        key: name,
        keyFrom: key.from,
        keyTo: key.to,
        value,
        from: key.from,
        to: value?.to ?? key.to,
      })
      return value !== null
    })
    if (this.text[this.pos] === '}') close = this.pos++
    else this.error(from, from + 1, '"{" is not closed')
    return { type: 'object', from, to: this.pos, members, close }
  }

  array(): JsonValue {
    const from = this.pos++
    const items: Array<JsonValue> = []
    let close: number | null = null
    this.list(']', () => {
      const value = this.value()
      if (value) items.push(value)
      return value !== null
    })
    if (this.text[this.pos] === ']') close = this.pos++
    else this.error(from, from + 1, '"[" is not closed')
    return { type: 'array', from, to: this.pos, items, close }
  }

  /**
   * Reads comma-separated entries up to `end`, leaving the position on it (or
   * wherever reading had to stop). `entry` returns false when it failed, so
   * the rest of that entry is skipped.
   */
  private list(end: '}' | ']', entry: () => boolean) {
    this.skipSpace()
    if (this.text[this.pos] === end) return
    let comma = -1
    for (;;) {
      this.skipSpace()
      if (comma >= 0 && this.text[this.pos] === end) {
        this.error(comma, comma + 1, 'Trailing comma')
        return
      }
      if (!entry()) this.recover()
      for (;;) {
        this.skipSpace()
        const c = this.text[this.pos] as string | undefined
        if (c === ',') {
          comma = this.pos++
          break
        }
        if (c === undefined || c === '}' || c === ']') return
        this.error(this.pos, this.pos + 1, `Expected "," or "${end}"`)
        // Most likely a forgotten comma: read the next entry.
        if (c === '"' || c === '{' || c === '[') {
          comma = -1
          break
        }
        this.recover()
      }
    }
  }

  /** Skips to the next `,`, `}` or `]` at this nesting level. */
  private recover() {
    let depth = 0
    while (this.pos < this.text.length) {
      const c = this.text[this.pos]
      if (c === '"') {
        this.skipString()
        continue
      }
      if (c === '{' || c === '[') depth++
      else if (c === '}' || c === ']') {
        if (depth === 0) return
        depth--
      } else if (c === ',' && depth === 0) return
      this.pos++
    }
  }

  private skipString() {
    let i = this.pos + 1
    while (
      i < this.text.length &&
      this.text[i] !== '"' &&
      this.text[i] !== '\n'
    )
      i += this.text[i] === '\\' ? 2 : 1
    this.pos = Math.min(i + 1, this.text.length)
  }
}

/** Decodes a quoted JSON string, leniently when it is malformed. */
export function decodeString(raw: string): string {
  try {
    return JSON.parse(raw) as string
  } catch {
    const inner = raw.slice(
      1,
      raw.endsWith('"') && raw.length > 1 ? -1 : undefined,
    )
    return inner.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_, esc: string) => {
      if (esc.length === 5)
        return String.fromCharCode(parseInt(esc.slice(1), 16))
      return ESCAPES[esc] ?? esc
    })
  }
}

const ESCAPES: Record<string, string> = {
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
}

function childrenOf(
  value: JsonValue,
  parentPath: string,
  depth: number,
): Array<XmlNode> {
  if (value.type === 'object') {
    const counts = new Map<string, number>()
    return value.members.map((member) => {
      const index = (counts.get(member.key) ?? 0) + 1
      counts.set(member.key, index)
      const path = `${parentPath}/${encodeSegment(member.key)}[${index}]`
      return element(member.key, path, depth, member, member.value, false)
    })
  }
  if (value.type === 'array') {
    return value.items.map((item, i) =>
      element(
        String(i),
        `${parentPath}/${i}[1]`,
        depth,
        { from: item.from, to: item.to, keyFrom: item.from, keyTo: item.from },
        item,
        true,
      ),
    )
  }
  return []
}

function element(
  name: string,
  path: string,
  depth: number,
  range: { from: number; to: number; keyFrom: number; keyTo: number },
  value: JsonValue | null,
  item: boolean,
): XmlElement {
  const quoted = range.keyTo > range.keyFrom
  const type: JsonType = value?.type ?? 'missing'
  const children: Array<XmlNode> = !value
    ? []
    : value.type === 'object' || value.type === 'array'
      ? childrenOf(value, path, depth + 1)
      : [
          {
            kind: 'text',
            from: value.from,
            to: value.to,
            raw: value.raw,
            value: value.value,
          },
        ]
  return {
    kind: 'element',
    path,
    name,
    depth,
    from: range.from,
    to: range.to,
    nameFrom: quoted ? range.keyFrom + 1 : range.keyFrom,
    nameTo: quoted ? Math.max(range.keyFrom + 1, range.keyTo - 1) : range.keyTo,
    openEndFrom: range.keyTo,
    openTo: range.keyTo,
    closeFrom: null,
    closeNameFrom: null,
    closeNameTo: null,
    selfClosing: false,
    attrs: [],
    children,
    json: {
      type,
      valueFrom: value?.from ?? range.to,
      valueTo: value?.to ?? range.to,
      close: value && 'close' in value ? value.close : null,
      item,
    },
  }
}
