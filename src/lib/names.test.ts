import { describe, expect, it } from 'vitest'

import { localName, sameName } from './names'

describe('names', () => {
  it('drops the namespace prefix of tags and attributes', () => {
    expect(localName('soap:Body')).toBe('Body')
    expect(localName('Body')).toBe('Body')
    expect(localName('@xsi:type')).toBe('@type')
    expect(localName('@id')).toBe('@id')
    expect(localName(':odd')).toBe(':odd')
    expect(localName('odd:')).toBe('odd:')
  })

  it('compares names without their prefix', () => {
    expect(sameName('soap:Body', 's:Body')).toBe(true)
    expect(sameName('Body', 'soap:Body')).toBe(true)
    expect(sameName('soap:Body', 'soap:Header')).toBe(false)
  })
})
