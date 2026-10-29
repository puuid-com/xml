import { describe, expect, it } from 'vitest'

import { addJsonChild, jsonLiteral, removeJsonNode, setJsonValue } from './edit'
import { formatJson } from './format'
import { parseJson, parseJsonAst } from './parse'
import { documentDefaults, languageOf, removeElement } from '#/lib/document'
import { defaultKeys } from '#/lib/xml/defaults'
import { displayPath, elementAt, elementByPath } from '#/lib/xml/locate'
import { childElements, isLeaf, leafValue } from '#/lib/xml/model'
import type { TextChange } from '#/lib/xml/edit'

function apply(text: string, changes: Array<TextChange>) {
  return [...changes]
    .sort((a, b) => b.from - a.from)
    .reduce((acc, c) => acc.slice(0, c.from) + c.insert + acc.slice(c.to), text)
}

function parse(text: string) {
  const doc = parseJson(text)
  expect(doc.errors).toEqual([])
  return doc
}

function at(text: string, path: string) {
  return elementByPath(parse(text).nodes, path)!
}

describe('parseJson', () => {
  it('maps keys and array items to elements with paths', () => {
    const doc = parse('{"a": {"b": 1}, "list": [true, {"c": null}]}')
    expect(doc.language).toBe('json')
    const [a, list] = doc.nodes.filter((n) => n.kind === 'element')
    expect(a.name).toBe('a')
    expect(a.path).toBe('/a[1]')
    expect(childElements(a)[0].path).toBe('/a[1]/b[1]')
    expect(childElements(list).map((e) => e.name)).toEqual(['0', '1'])
    expect(childElements(list)[0].json?.item).toBe(true)
    expect(at('{"list": [0, {"c": 1}]}', '/list[1]/1[1]/c[1]').name).toBe('c')
  })

  it('reads leaf values, decoded', () => {
    const doc = parse(
      '{"s": "a\\nb \\u0026", "n": -1.5e3, "b": false, "z": null}',
    )
    const values = doc.nodes.map((n) =>
      n.kind === 'element' ? leafValue(n) : '',
    )
    expect(values).toEqual(['a\nb &', '-1.5e3', 'false', 'null'])
  })

  it('treats containers as non-leaves, even when empty', () => {
    const doc = parse('{"o": {}, "a": [], "s": ""}')
    const [o, a, s] = doc.nodes.filter((n) => n.kind === 'element')
    expect([isLeaf(o), isLeaf(a), isLeaf(s)]).toEqual([false, false, true])
  })

  it('allows variables as values and inside strings', () => {
    const doc = parse('{"qty": <<qty>>, "url": "<<base>>/x"}')
    const [qty, url] = doc.nodes.filter((n) => n.kind === 'element')
    expect(qty.json?.type).toBe('var')
    expect(leafValue(qty)).toBe('<<qty>>')
    expect(leafValue(url)).toBe('<<base>>/x')
  })

  it('flags malformed variables inside strings', () => {
    expect(parseJson('{"a": "{{{b}}}"}').errors).toEqual([
      { from: 7, to: 14, message: 'Invalid variable {{{b}}}' },
    ])
    expect(parseJson('{"a": "<<<b>>", "c": "${d"}').errors).toHaveLength(2)
    expect(parseJson('{"a": "{{b}}{{c}} ${d}"}').errors).toEqual([])
  })

  it('allows {{var}} variables as values', () => {
    const doc = parse('{"qty": {{qty}}, "nested": {"a": {{ b }}}}')
    expect(doc.errors).toEqual([])
    const [qty] = doc.nodes.filter((n) => n.kind === 'element')
    expect(qty.json?.type).toBe('var')
    expect(leafValue(qty)).toBe('{{qty}}')
  })

  it('allows dollar variables at the root and inside objects and arrays', () => {
    const text = '{"qty": ${qty}, "nested": [${ $randomInt }, {"a": ${b}}]}'
    const doc = parse(text)
    const qty = elementByPath(doc.nodes, '/qty[1]')!
    expect(qty.json?.type).toBe('var')
    expect(leafValue(qty)).toBe('${qty}')
    expect(text.slice(qty.json!.valueFrom, qty.json!.valueTo)).toBe('${qty}')
    expect(leafValue(at(text, '/nested[1]/0[1]'))).toBe('${ $randomInt }')
    expect(leafValue(at(text, '/nested[1]/1[1]/a[1]'))).toBe('${b}')
    expect(parseJsonAst('${qty}')).toEqual({
      value: { type: 'var', from: 0, to: 6, raw: '${qty}', value: '${qty}' },
      errors: [],
    })
  })

  it('names the key range without quotes', () => {
    const text = '{"key": 1}'
    const el = at(text, '/key[1]')
    expect(text.slice(el.nameFrom, el.nameTo)).toBe('key')
    expect(text.slice(el.from, el.to)).toBe('"key": 1')
  })

  it('escapes slashes in path segments', () => {
    const el = at('{"a/b": 1}', '/a%2Fb[1]')
    expect(displayPath(el.path)).toEqual(['a/b'])
  })

  it('finds the element at a position', () => {
    const text = '{"a": {"b": 1}}'
    expect(elementAt(parse(text).nodes, text.indexOf('1'))?.name).toBe('b')
  })

  it('reports errors and still returns a tree', () => {
    const cases: Array<[string, string]> = [
      ['{"a": 1,}', 'Trailing comma'],
      ['{"a": 1 "b": 2}', 'Expected "," or "}"'],
      ['{"a" 1}', 'Expected ":"'],
      ['{"a": tru}', 'Unexpected "tru"'],
      ['{"a": 1, "a": 2}', 'Duplicate key "a"'],
      ['{"a": "x', 'String is not closed'],
      ['[1, 2', '"[" is not closed'],
      ['{} {}', 'Unexpected input after the value'],
      ['{"a": 01}', 'Unexpected "01"'],
      ['{a: 1}', 'Expected a property name'],
    ]
    for (const [text, message] of cases) {
      const doc = parseJson(text)
      expect(doc.errors.map((e) => e.message)).toContain(message)
    }
    const doc = parseJson('{"a": 1 "b": 2}')
    expect(doc.nodes.map((n) => (n.kind === 'element' ? n.name : ''))).toEqual([
      'a',
      'b',
    ])
  })

  it('treats an empty document as valid', () => {
    expect(parseJsonAst('  \n')).toEqual({ value: null, errors: [] })
  })
})

describe('formatJson', () => {
  it('indents and keeps values as written', () => {
    const result = formatJson(
      '{"a":1.50,"b":[1,{"c":"\\u00e9"}],"d":{},"e":[]}',
    )
    expect(result).toEqual({
      ok: true,
      text: `{
  "a": 1.50,
  "b": [
    1,
    {
      "c": "\\u00e9"
    }
  ],
  "d": {},
  "e": []
}
`,
    })
  })

  it('refuses documents with errors', () => {
    expect(formatJson('{"a": }').ok).toBe(false)
  })

  it('sorts keys but never array items', () => {
    const text = '{"b": [3, 1], "a": {"z": 1, "y": 2}}'
    expect(formatJson(text, { sort: 'asc' })).toEqual({
      ok: true,
      text: '{\n  "a": {\n    "y": 2,\n    "z": 1\n  },\n  "b": [\n    3,\n    1\n  ]\n}\n',
    })
    const desc = formatJson('{"a": 1, "c": 2, "b": 3}', { sort: 'desc' })
    expect(desc.ok && desc.text).toBe('{\n  "c": 2,\n  "b": 3,\n  "a": 1\n}\n')
  })

  it('sorts keys by a custom order, `@` keys included', () => {
    const result = formatJson('{"a": 1, "@id": 2, "c": 3, "b": 4}', {
      sort: 'custom',
      order: ['c', '@id'],
    })
    expect(result.ok && result.text).toBe(
      '{\n  "c": 3,\n  "@id": 2,\n  "a": 1,\n  "b": 4\n}\n',
    )
  })

  it('puts highlighted keys first', () => {
    const result = formatJson('{"a": 1, "b": 2, "c": 3}', { first: ['c'] })
    expect(result.ok && result.text).toBe(
      '{\n  "c": 3,\n  "a": 1,\n  "b": 2\n}\n',
    )
  })

  it('keeps one blank line between entries when asked', () => {
    const text = '{\n  "a": 1,\n\n\n  "b": 2\n}'
    const kept = formatJson(text, { removeEmptyLines: false })
    expect(kept.ok && kept.text).toBe('{\n  "a": 1,\n\n  "b": 2\n}\n')
    const removed = formatJson(text)
    expect(removed.ok && removed.text).toBe('{\n  "a": 1,\n  "b": 2\n}\n')
  })

  it('trims spaces in variables and keeps bare ones', () => {
    const result = formatJson('{"q": << qty >>, "u": "<< base >>"}', {
      trimVars: true,
    })
    expect(result.ok && result.text).toBe(
      '{\n  "q": <<qty>>,\n  "u": "<<base>>"\n}\n',
    )
  })

  it('formats dollar variables without quoting their values', () => {
    expect(
      formatJson('{"q":${ qty },"items":[${$randomInt}]}', {
        trimVars: true,
      }),
    ).toEqual({
      ok: true,
      text: '{\n  "q": ${qty},\n  "items": [\n    ${$randomInt}\n  ]\n}\n',
    })
  })
})

describe('JSON edits', () => {
  it('sets values, keeping the type where it still fits', () => {
    expect(jsonLiteral('42', 'number')).toBe('42')
    expect(jsonLiteral('abc', 'number')).toBe('"abc"')
    expect(jsonLiteral('true', 'string')).toBe('"true"')
    expect(jsonLiteral('<<v>>', 'null')).toBe('<<v>>')
    expect(jsonLiteral('{{v}}', 'null')).toBe('{{v}}')
    expect(jsonLiteral('say "hi"', 'string')).toBe('"say \\"hi\\""')

    const text = '{"a": "x", "n": 1}'
    expect(apply(text, setJsonValue(at(text, '/a[1]'), 'y\n'))).toBe(
      '{"a": "y\\n", "n": 1}',
    )
    expect(apply(text, setJsonValue(at(text, '/n[1]'), '2'))).toBe(
      '{"a": "x", "n": 2}',
    )
  })

  it('does not set values on containers', () => {
    expect(setJsonValue(at('{"o": {}}', '/o[1]'), 'x')).toEqual([])
  })

  it('keeps dollar variables valid after tree edits and default application', () => {
    const text = '{"qty": 1}'
    const edited = apply(text, setJsonValue(at(text, '/qty[1]'), '${qty}'))
    expect(edited).toBe('{"qty": ${qty}}')
    expect(leafValue(at(edited, '/qty[1]'))).toBe('${qty}')
    const restored = apply(
      edited,
      documentDefaults(parse(edited), [{ key: 'qty', value: '2' }]),
    )
    expect(restored).toBe('{"qty": 2}')
    expect(parseJson(restored).errors).toEqual([])
  })

  it('adds children to objects and arrays', () => {
    const text = '{\n  "o": {\n    "key": 1\n  },\n  "a": [],\n  "s": {}\n}'
    expect(apply(text, addJsonChild(text, at(text, '/o[1]'), 'key'))).toBe(
      '{\n  "o": {\n    "key": 1,\n    "key2": ""\n  },\n  "a": [],\n  "s": {}\n}',
    )
    expect(apply(text, addJsonChild(text, at(text, '/a[1]'), 'key'))).toBe(
      '{\n  "o": {\n    "key": 1\n  },\n  "a": [\n    ""\n  ],\n  "s": {}\n}',
    )
    const inline = '{"o": {"a": 1}}'
    expect(apply(inline, addJsonChild(inline, at(inline, '/o[1]'), 'b'))).toBe(
      '{"o": {"a": 1, "b": ""}}',
    )
  })

  it('removes entries with their comma', () => {
    const text = '{\n  "a": 1,\n  "b": 2,\n  "c": 3\n}'
    const doc = parse(text)
    const remove = (path: string) =>
      apply(text, removeElement(text, elementByPath(doc.nodes, path)!, doc))
    expect(remove('/a[1]')).toBe('{\n  "b": 2,\n  "c": 3\n}')
    expect(remove('/b[1]')).toBe('{\n  "a": 1,\n  "c": 3\n}')
    expect(remove('/c[1]')).toBe('{\n  "a": 1,\n  "b": 2\n}')

    const inline = '{"x": [1, 2, 3]}'
    const list = childElements(at(inline, '/x[1]'))
    expect(apply(inline, removeJsonNode(inline, list[1], list))).toBe(
      '{"x": [1, 3]}',
    )
    expect(apply(inline, removeJsonNode(inline, list[2], list))).toBe(
      '{"x": [1, 2]}',
    )
    expect(parseJson(remove('/b[1]')).errors).toEqual([])
  })
})

describe('JSON defaults', () => {
  it('applies rules to leaf keys and skips array items and containers', () => {
    const text = '{"env": "dev", "list": ["a"], "obj": {"env": 1}, "n": {}}'
    const doc = parse(text)
    expect(defaultKeys(doc.nodes)).toEqual(['env'])
    const changes = documentDefaults(doc, [
      { key: 'env', value: 'prod' },
      { key: '0', value: 'x' },
      { key: 'n', value: 'x' },
    ])
    expect(apply(text, changes)).toBe(
      '{"env": "prod", "list": ["a"], "obj": {"env": "prod"}, "n": {}}',
    )
  })
})

describe('languageOf', () => {
  it('uses the extension, then the content', () => {
    expect(languageOf('a.json', '<a/>')).toBe('json')
    expect(languageOf('a.xml', '{}')).toBe('xml')
    expect(languageOf('notes', '  [1]')).toBe('json')
    expect(languageOf('notes', '<a/>')).toBe('xml')
  })
})
