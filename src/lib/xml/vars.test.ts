import { describe, expect, it } from 'vitest'

import { convertVars, findVars, trimVar, varStyleOf } from './vars'

describe('vars', () => {
  it('finds ${name} variables alongside the other styles', () => {
    expect(findVars('<<a>> {{b}} ${ c } ${$guid}').map((v) => v.name)).toEqual([
      'a',
      'b',
      'c',
      '$guid',
    ])
  })

  it('trims ${ name } keeping its brackets', () => {
    expect(trimVar('${ host }')).toBe('${host}')
    expect(trimVar('{{ host }}')).toBe('{{host}}')
  })

  it('switches every variable to one style and counts the changes', () => {
    const text = '<a><<host>></a><b>{{ port }}</b><c>${$guid}</c>'
    expect(convertVars(text, 'curly')).toEqual({
      text: '<a>{{host}}</a><b>{{port}}</b><c>{{$guid}}</c>',
      count: 3,
    })
    expect(convertVars(text, 'angle').text).toBe(
      '<a><<host>></a><b><<port>></b><c><<$guid>></c>',
    )
    expect(convertVars(text, 'dollar').text).toBe(
      '<a>${host}</a><b>${port}</b><c>${$guid}</c>',
    )
    expect(convertVars('{{a}}', 'curly').count).toBe(0)
  })
})

describe('varStyleOf', () => {
  it('reads the style of the first variable', () => {
    expect(varStyleOf('<a>${x}</a><b>{{y}}</b>')).toBe('dollar')
    expect(varStyleOf('<a><<x>></a>')).toBe('angle')
    expect(varStyleOf('<a>{{ x }}</a>')).toBe('curly')
    expect(varStyleOf('<a>x</a>')).toBeUndefined()
  })
})
