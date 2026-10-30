import { describe, expect, it } from 'vitest'

import { isFlatFile, parseFlat } from './parse'

const SAMPLE = [
  'SH|1000|             40073950002|P|KNEMBECTA               |20261029',
  'SR|1200|             40073950002|(ShipmentReference2)    |7    ',
  'SR|1200|             40073950002|CAFD/TOR01              |10   ',
  'PC|1000|             40073950002|   1|0|    0.15|',
].join('\r\n')

describe('isFlatFile', () => {
  it('accepts lines that all start with a record type', () => {
    expect(isFlatFile(SAMPLE)).toBe(true)
    expect(isFlatFile(`${SAMPLE}\n\n`)).toBe(true)
  })

  it('rejects XML, JSON, empty text and stray lines', () => {
    expect(isFlatFile('<root/>')).toBe(false)
    expect(isFlatFile('{"a": 1}')).toBe(false)
    expect(isFlatFile('  \n')).toBe(false)
    expect(isFlatFile(`${SAMPLE}\nnot a record`)).toBe(false)
  })
})

describe('parseFlat', () => {
  const flat = parseFlat(SAMPLE)

  it('groups records by type in order of first appearance', () => {
    expect(flat.groups.map((g) => [g.type, g.records.length])).toEqual([
      ['SH', 1],
      ['SR', 2],
      ['PC', 1],
    ])
    expect(flat.records.map((r) => r.line)).toEqual([1, 2, 3, 4])
  })

  it('trims the padding and points at each value', () => {
    const sr = flat.groups[1].records[1]
    expect(sr.fields.map((f) => f.value)).toEqual([
      'SR',
      '1200',
      '40073950002',
      'CAFD/TOR01',
      '10',
    ])
    const ref = sr.fields[3]
    expect(SAMPLE.slice(ref.from, ref.to)).toBe('CAFD/TOR01')
    expect(SAMPLE.slice(sr.from, sr.to)).toBe(SAMPLE.split('\r\n')[2])
  })

  it('keeps blank fields and counts the widest record', () => {
    const pc = flat.groups[2]
    expect(pc.width).toBe(7)
    const last = pc.records[0].fields[6]
    expect(last).toMatchObject({ value: '' })
    expect(last.from).toBe(last.to)
  })
})
