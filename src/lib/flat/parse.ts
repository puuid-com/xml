// Pipe-delimited flat files, such as shipment exports: each line is a record
// whose first field names its type (`SH|…`, `PC|…`), and fields are padded
// with spaces to fixed widths. Offsets match CodeMirror's, like the XML model.

export interface FlatField {
  /** Without the padding. */
  value: string
  /** The value's range, or an empty range where a blank field starts. */
  from: number
  to: number
}

export interface FlatRecord {
  type: string
  /** 1-based line number. */
  line: number
  from: number
  to: number
  /** Every field, the record type first. */
  fields: Array<FlatField>
}

export interface FlatGroup {
  type: string
  records: Array<FlatRecord>
  /** Most fields in any of its records. */
  width: number
}

export interface FlatFile {
  records: Array<FlatRecord>
  /** Records by type, in order of first appearance. */
  groups: Array<FlatGroup>
}

const RECORD = /^[A-Z0-9]{2,4}\|/

interface Line {
  text: string
  from: number
  number: number
}

function* lines(text: string): Generator<Line> {
  let from = 0
  let number = 1
  while (from <= text.length) {
    const end = text.indexOf('\n', from)
    const stop = end === -1 ? text.length : end
    const raw = text.slice(from, stop)
    yield { text: raw.endsWith('\r') ? raw.slice(0, -1) : raw, from, number }
    if (end === -1) break
    from = end + 1
    number++
  }
}

/** Whether every non-blank line is a record, and there is at least one. */
export function isFlatFile(text: string) {
  let found = false
  for (const line of lines(text)) {
    if (line.text.trim() === '') continue
    if (!RECORD.test(line.text)) return false
    found = true
  }
  return found
}

function fieldsOf(line: Line): Array<FlatField> {
  const fields: Array<FlatField> = []
  let start = 0
  for (const raw of line.text.split('|')) {
    const lead = raw.length - raw.trimStart().length
    const value = raw.trim()
    const from = line.from + start + lead
    fields.push({ value, from, to: from + value.length })
    start += raw.length + 1
  }
  return fields
}

export function parseFlat(text: string): FlatFile {
  const records: Array<FlatRecord> = []
  const groups = new Map<string, FlatGroup>()
  for (const line of lines(text)) {
    if (!RECORD.test(line.text)) continue
    const fields = fieldsOf(line)
    const record: FlatRecord = {
      type: fields[0].value,
      line: line.number,
      from: line.from,
      to: line.from + line.text.length,
      fields,
    }
    records.push(record)
    let group = groups.get(record.type)
    if (!group) {
      group = { type: record.type, records: [], width: 0 }
      groups.set(record.type, group)
    }
    group.records.push(record)
    group.width = Math.max(group.width, fields.length)
  }
  return { records, groups: [...groups.values()] }
}
