import { describe, expect, it } from 'vitest'

import { bestProfile, fingerprint, similarity } from './fingerprint'

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

describe('bestProfile', () => {
  const profiles = [
    { id: 'a', samples: [fingerprint('a.xml', order('a', '1', '2'))] },
    { id: 'b', samples: [fingerprint('b.xml', order('b', '1', '2'))] },
  ]

  it('picks the profile of files shaped alike', () => {
    const extra = order('b', '7', '8').replace(
      '</b:Order>',
      '<b:Note/></b:Order>',
    )
    expect(bestProfile(fingerprint('x.xml', extra), profiles)).toBe('b')
  })

  it('picks none when nothing is close', () => {
    expect(
      bestProfile(fingerprint('x.xml', '<other><y/></other>'), profiles),
    ).toBeNull()
  })

  it('picks none when two profiles are as close', () => {
    const tie = [...profiles, { id: 'c', samples: profiles[0].samples }]
    expect(
      bestProfile(fingerprint('x.xml', order('a', '3', '4')), tie),
    ).toBeNull()
  })
})
