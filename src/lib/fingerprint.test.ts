import { describe, expect, it } from 'vitest'

import {
  distinctiveness,
  fingerprint,
  profileMatcher,
  similarity,
} from './fingerprint'

const order = (prefix: string, id: string, qty: string) => `
<${prefix}:Order xmlns:${prefix}="urn:${prefix}" status="${id}">
  <${prefix}:Id>${id}</${prefix}:Id>
  <${prefix}:Line><${prefix}:Qty>${qty}</${prefix}:Qty></${prefix}:Line>
</${prefix}:Order>`

describe('fingerprint', () => {
  it('reads structure and prefixes, not values', () => {
    expect(fingerprint('a.xml', order('a', '1', '5'))).toEqual(
      fingerprint('b.xml', order('a', '99', '<<qty>>')),
    )
    expect(fingerprint('a.xml', order('a', '1', '5'))).toEqual([
      'attr:a:Order@status',
      'nest:>a:Order',
      'nest:a:Line>a:Qty',
      'nest:a:Order>a:Id',
      'nest:a:Order>a:Line',
      'prefix:a',
      'root:a:Order',
      'tag:a:Id',
      'tag:a:Line',
      'tag:a:Order',
      'tag:a:Qty',
      'xmlns:xmlns:a',
    ])
  })

  it('ignores namespace URIs', () => {
    expect(fingerprint('a.xml', '<r xmlns:x="urn:one"/>')).toEqual(
      fingerprint('a.xml', '<r xmlns:x="urn:two"/>'),
    )
  })

  it('reads JSON keys, with array items alike', () => {
    expect(
      fingerprint('a.json', '{"items": [{"id": 1}, {"id": 2, "x": null}]}'),
    ).toEqual([
      'nest:>items',
      'nest:[]>id',
      'nest:[]>x',
      'nest:items>[]',
      'root:{}',
      'tag:[]',
      'tag:id',
      'tag:items',
      'tag:x',
    ])
  })

  it('is empty for an empty file', () => {
    expect(fingerprint('a.xml', '')).toEqual([])
  })
})

describe('similarity', () => {
  it('is 1 for one shape and low across prefixes', () => {
    const a = fingerprint('a.xml', order('a', '1', '2'))
    expect(similarity(a, a)).toBe(1)
    expect(similarity(a, fingerprint('b.xml', order('b', '1', '2')))).toBe(0)
  })
})

describe('profileMatcher', () => {
  const profiles = [
    { id: 'a', samples: [fingerprint('a.xml', order('a', '1', '2'))] },
    { id: 'b', samples: [fingerprint('b.xml', order('b', '1', '2'))] },
  ]

  it('picks the profile of files shaped alike', () => {
    const extra = order('b', '7', '8').replace(
      '</b:Order>',
      '<b:Note/></b:Order>',
    )
    expect(profileMatcher(profiles)(fingerprint('x.xml', extra))).toBe('b')
  })

  it('picks none when nothing is close', () => {
    expect(
      profileMatcher(profiles)(fingerprint('x.xml', '<other><y/></other>')),
    ).toBeNull()
  })

  it('picks none when two profiles are as close', () => {
    const tie = [...profiles, { id: 'c', samples: profiles[0].samples }]
    expect(
      profileMatcher(tie)(fingerprint('x.xml', order('a', '3', '4'))),
    ).toBeNull()
  })
})

describe('distinctiveness', () => {
  // Alike but for one tag, as files of one schema from two systems can be.
  const shared = Array.from({ length: 30 }, (_, i) => `<f${i}/>`).join('')
  const doc = (extra: string) => `<Order>${shared}${extra}</Order>`
  const profiles = [
    { id: 'a', samples: [fingerprint('a.xml', doc('<OnlyA/>'))] },
    { id: 'b', samples: [fingerprint('b.xml', doc('<OnlyB/>'))] },
  ]
  const print = fingerprint('x.xml', doc('<OnlyA/>'))

  it('weighs features one profile has over shared ones', () => {
    const weight = distinctiveness(profiles)
    expect(weight('tag:OnlyA')).toBeGreaterThan(3 * weight('tag:f1'))
  })

  it('tells apart files that share most of their structure', () => {
    // Plain weights find both about as close.
    expect(
      similarity(print, profiles[0].samples[0]) -
        similarity(print, profiles[1].samples[0]),
    ).toBeLessThan(0.1)
    expect(profileMatcher(profiles)(print)).toBe('a')
  })

  it("counts a feature by the share of a profile's files with it", () => {
    const odd = fingerprint('b.xml', doc('<OnlyA/>'))
    const many = [
      profiles[0],
      { id: 'b', samples: [...Array(9).fill(profiles[1].samples[0]), odd] },
    ]
    const weight = distinctiveness(many)
    expect(weight('tag:OnlyA')).toBeGreaterThan(3 * weight('tag:f1'))
  })
})
