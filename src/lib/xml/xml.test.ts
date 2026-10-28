import { describe, expect, it } from 'vitest'

import { addChild, diffChange, removeNode, setAttr, setText } from './edit'
import { decodeEntities, escapeAttr, escapeText } from './entities'
import { formatXml } from './format'
import { elementAt, elementByPath, flattenVisible } from './locate'
import { childElements, leafValue } from './model'
import { parseXml } from './parse'
import { findVars, maskVars } from './vars'
import type { TextChange } from './edit'
import type { XmlElement } from './model'

function apply(text: string, changes: Array<TextChange>) {
  return [...changes]
    .sort((a, b) => b.from - a.from)
    .reduce((acc, c) => acc.slice(0, c.from) + c.insert + acc.slice(c.to), text)
}

function root(text: string) {
  const doc = parseXml(text)
  expect(doc.errors).toEqual([])
  return doc.root!
}

function child(el: XmlElement, index = 0) {
  return childElements(el)[index]
}

describe('vars', () => {
  it('masks without changing length', () => {
    const text = '<a href="<<base>>/x">Hi <<user.name>>!</a>'
    const masked = maskVars(text)
    expect(masked).toHaveLength(text.length)
    expect(masked).not.toContain('<<')
  })

  it('finds variables with their ranges', () => {
    expect(findVars('x <<a>> y << b_2 >>')).toEqual([
      { name: 'a', from: 2, to: 7 },
      { name: 'b_2', from: 10, to: 19 },
    ])
  })

  it('ignores things that are not variables', () => {
    expect(findVars('<<1abc>> << >> <<$>> <a>')).toEqual([])
  })

  it('accepts Postman dynamic variables', () => {
    expect(findVars('TEST_<<$randomInt>>')).toEqual([
      { name: '$randomInt', from: 5, to: 19 },
    ])
    const doc = parseXml('<MessageType>TEST_<<$randomInt>></MessageType>')
    expect(doc.errors).toEqual([])
  })

  it('flags a stray > next to a <<var>>', () => {
    expect(parseXml('<tag>><<var>></tag>').errors).toEqual([
      { from: 5, to: 6, message: 'Stray > next to variable <<var>>' },
    ])
    expect(parseXml('<tag><<var>>></tag>').errors).toHaveLength(1)
    expect(parseXml('<tag a="<<v>>>"/>').errors).toHaveLength(1)
    expect(parseXml('<tag><<var>></tag>').errors).toEqual([])
    expect(parseXml('<tag>a > <<var>></tag>').errors).toEqual([])
  })

  it('accepts {{name}} variables too', () => {
    expect(findVars('x {{a}} y {{ $b }} <<c}} {{d>>')).toEqual([
      { name: 'a', from: 2, to: 7 },
      { name: '$b', from: 10, to: 18 },
    ])
    const doc = parseXml('<a k="{{id}}">Hi {{name}}</a>')
    expect(doc.errors).toEqual([])
  })
})

describe('entities', () => {
  it('decodes predefined and numeric references', () => {
    expect(decodeEntities('&lt;&amp;&#65;&#x42;&quot;&unknown;')).toBe(
      '<&AB"&unknown;',
    )
  })

  it('escapes text but keeps variables', () => {
    expect(escapeText('a < b & <<v>>')).toBe('a &lt; b &amp; <<v>>')
  })

  it('escapes the matching quote in attributes', () => {
    expect(escapeAttr(`say "hi"`, '"')).toBe('say &quot;hi&quot;')
    expect(escapeAttr(`it's`, "'")).toBe('it&apos;s')
  })
})

describe('parseXml', () => {
  const sample = `<?xml version="1.0"?>
<!-- note -->
<root a="<<x>>" b='1 &amp; 2'>
  <item id="1">Hello <<name>> &lt;3</item>
  <item/>
  <data><![CDATA[ <raw> ]]></data>
  <p>mixed <b>bold</b> text</p>
</root>`

  it('parses vars in text and attributes without errors', () => {
    const el = root(sample)
    expect(el.name).toBe('root')
    expect(el.attrs.map((a) => [a.name, a.value, a.quote])).toEqual([
      ['a', '<<x>>', '"'],
      ['b', '1 & 2', "'"],
    ])
    expect(leafValue(child(el))).toBe('Hello <<name>> <3')
  })

  it('assigns stable paths', () => {
    const el = root(sample)
    expect(childElements(el).map((c) => c.path)).toEqual([
      '/root[1]/item[1]',
      '/root[1]/item[2]',
      '/root[1]/data[1]',
      '/root[1]/p[1]',
    ])
    expect(child(el, 1).selfClosing).toBe(true)
    expect(leafValue(child(el, 2))).toBe(' <raw> ')
  })

  it('reports structural errors', () => {
    expect(parseXml('<a><b></a>').errors[0].message).toContain('<b>')
    expect(parseXml('<a/><b/>').errors[0].message).toContain('one root')
    expect(parseXml('<a x="1" x="2"/>').errors[0].message).toContain(
      'Duplicate',
    )
    expect(parseXml('<a>&nbsp;</a>').errors[0].message).toContain('&nbsp;')
    expect(parseXml('<a>a & b</a>').errors).not.toEqual([])
  })

  it('treats an empty document as valid', () => {
    expect(parseXml('  \n')).toEqual({
      language: 'xml',
      nodes: [],
      root: null,
      errors: [],
    })
  })
})

describe('formatXml', () => {
  it('indents element-only content and keeps text exact', () => {
    const input =
      '<?xml version="1.0"?><root a="<<x>>"><item>  Hi <<n>> </item><p>a <b>b</b> c</p><e/><!--c--></root>'
    const result = formatXml(input)
    expect(result).toEqual({
      ok: true,
      text: `<?xml version="1.0"?>
<root a="<<x>>">
  <item>  Hi <<n>> </item>
  <p>a <b>b</b> c</p>
  <e />
  <!--c-->
</root>
`,
    })
  })

  it('is idempotent', () => {
    const input = '<a>\n<b>\n<c>1</c>\n</b>\n</a>'
    const once = formatXml(input)
    expect(once.ok && formatXml(once.text)).toEqual(once)
  })

  it('removes empty lines, or keeps one between elements', () => {
    const input = '<a>\n\n<b/>\n\n\n<c>x\n\n  y</c>\n\n</a>'
    expect(formatXml(input)).toEqual({
      ok: true,
      text: '<a>\n  <b />\n  <c>x\n  y</c>\n</a>\n',
    })
    expect(formatXml(input, { removeEmptyLines: false })).toEqual({
      ok: true,
      text: '<a>\n  <b />\n\n  <c>x\n\n  y</c>\n</a>\n',
    })
  })

  it('trims spaces inside variables', () => {
    const input = '<a k="<< id >>">Hi <<  name>></a>'
    expect(formatXml(input, { trimVars: true })).toEqual({
      ok: true,
      text: '<a k="<<id>>">Hi <<name>></a>\n',
    })
    expect(formatXml('<a>{{ id }}</a>', { trimVars: true })).toEqual({
      ok: true,
      text: '<a>{{id}}</a>\n',
    })
  })

  it('removes tag prefixes', () => {
    const input =
      '<s:Envelope xmlns:s="urn:s"><s:Body a:x="1">Hi <b:i>there</b:i></s:Body><s:E/></s:Envelope>'
    expect(formatXml(input, { stripPrefixes: true })).toEqual({
      ok: true,
      text: '<Envelope xmlns:s="urn:s">\n  <Body a:x="1">Hi <i>there</i></Body>\n  <E />\n</Envelope>\n',
    })
  })

  it('sorts elements and attributes', () => {
    const input = '<r><c z="1" a="2"/><!--b--><b/><a/></r>'
    expect(formatXml(input, { sort: 'asc' })).toEqual({
      ok: true,
      text: '<r>\n  <a />\n  <!--b-->\n  <b />\n  <c a="2" z="1" />\n</r>\n',
    })
    expect(formatXml(input, { sort: 'desc' })).toEqual({
      ok: true,
      text: '<r>\n  <c z="1" a="2" />\n  <!--b-->\n  <b />\n  <a />\n</r>\n',
    })
  })

  it('puts given tags first', () => {
    const input = '<r><c/><b/><a/><b/></r>'
    expect(formatXml(input, { first: ['b'] })).toEqual({
      ok: true,
      text: '<r>\n  <b />\n  <b />\n  <c />\n  <a />\n</r>\n',
    })
    expect(formatXml(input, { first: ['c', 'b'], sort: 'asc' })).toEqual({
      ok: true,
      text: '<r>\n  <b />\n  <b />\n  <c />\n  <a />\n</r>\n',
    })
  })

  it('sorts by a custom order', () => {
    const input = '<r><c z="1" a="2" m="3"/><!--b--><b/><a/><c/></r>'
    const order = ['c', 'b', '@m', '@a', 'missing']
    expect(formatXml(input, { sort: 'custom', order })).toEqual({
      ok: true,
      text: '<r>\n  <c m="3" a="2" z="1" />\n  <c />\n  <!--b-->\n  <b />\n  <a />\n</r>\n',
    })
    // Highlighted tags still lead; an empty order keeps the document's.
    expect(
      formatXml('<r><c/><b/><a/></r>', { sort: 'custom', order, first: ['a'] }),
    ).toEqual({ ok: true, text: '<r>\n  <a />\n  <c />\n  <b />\n</r>\n' })
    expect(
      formatXml('<r><c/>\n\n<b/></r>', {
        sort: 'custom',
        removeEmptyLines: false,
      }),
    ).toEqual({
      ok: true,
      text: '<r>\n  <c />\n\n  <b />\n</r>\n',
    })
  })

  it('sorts and leads by name without prefix', () => {
    const input = '<r><x:c/><y:b/><a/></r>'
    expect(formatXml(input, { sort: 'asc' })).toEqual({
      ok: true,
      text: '<r>\n  <a />\n  <y:b />\n  <x:c />\n</r>\n',
    })
    expect(
      formatXml(input, { sort: 'custom', order: ['b', 'ns:c', '@m'] }),
    ).toEqual({
      ok: true,
      text: '<r>\n  <y:b />\n  <x:c />\n  <a />\n</r>\n',
    })
    expect(formatXml(input, { first: ['z:a'] })).toEqual({
      ok: true,
      text: '<r>\n  <a />\n  <x:c />\n  <y:b />\n</r>\n',
    })
    expect(
      formatXml('<r z="1" x:m="2"/>', { sort: 'custom', order: ['@m'] }),
    ).toEqual({ ok: true, text: '<r x:m="2" z="1" />\n' })
  })

  it('refuses invalid documents', () => {
    expect(formatXml('<a><b></a>').ok).toBe(false)
  })
})

describe('edit', () => {
  const text = '<root>\n  <item id="1" kind="a">old</item>\n  <empty/>\n</root>'

  it('sets text with escaping', () => {
    const item = child(root(text))
    expect(apply(text, setText(item, 'a < <<v>>'))).toContain(
      '<item id="1" kind="a">a &lt; <<v>></item>',
    )
  })

  it('expands a self-closing element when given text', () => {
    const empty = child(root(text), 1)
    expect(apply(text, setText(empty, 'x'))).toContain('<empty>x</empty>')
  })

  it('sets attribute values with escaping', () => {
    const item = child(root(text))
    expect(apply(text, setAttr(item.attrs[0], '"2"'))).toContain(
      'id="&quot;2&quot;"',
    )
  })

  it('adds a child with matching indentation', () => {
    const el = root(text)
    expect(apply(text, addChild(text, el, 'next'))).toBe(
      '<root>\n  <item id="1" kind="a">old</item>\n  <empty/>\n  <next></next>\n</root>',
    )
    expect(apply(text, addChild(text, child(el, 1), 'x'))).toContain(
      '  <empty>\n    <x></x>\n  </empty>',
    )
  })

  it('removes a node and its line', () => {
    const el = root(text)
    expect(apply(text, removeNode(text, child(el)))).toBe(
      '<root>\n  <empty/>\n</root>',
    )
  })
})

describe('diffChange', () => {
  it('returns the smallest change', () => {
    expect(diffChange('<a>old</a>', '<a>new</a>')).toEqual({
      from: 3,
      to: 6,
      insert: 'new',
    })
    expect(diffChange('aaa', 'aaaa')).toEqual({ from: 3, to: 3, insert: 'a' })
    expect(diffChange('same', 'same')).toBeNull()
  })
})

describe('locate', () => {
  const text = '<a><b><c/></b><d/></a>'

  it('finds the deepest element at a position', () => {
    const doc = parseXml(text)
    expect(elementAt(doc.nodes, text.indexOf('<c'))?.name).toBe('c')
    expect(elementAt(doc.nodes, text.indexOf('<d'))?.name).toBe('d')
    expect(elementByPath(doc.nodes, '/a[1]/b[1]/c[1]')?.name).toBe('c')
  })

  it('skips collapsed subtrees', () => {
    const doc = parseXml(text)
    const names = (collapsed: Set<string>) =>
      flattenVisible(doc.nodes, collapsed).map((r) => r.el.name)
    expect(names(new Set())).toEqual(['a', 'b', 'c', 'd'])
    expect(names(new Set(['/a[1]/b[1]']))).toEqual(['a', 'b', 'd'])
  })
})
