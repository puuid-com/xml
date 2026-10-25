import { describe, expect, it } from 'vitest'

import {
  addAttr,
  addChild,
  diffChange,
  removeAttr,
  removeNode,
  renameElement,
  setAttr,
  setText,
} from './edit'
import { decodeEntities, escapeAttr, escapeText } from './entities'
import { formatXml } from './format'
import { elementAt, elementByPath, flattenVisible } from './locate'
import { childElements, leafValue } from './model'
import { parseXml } from './parse'
import { findVars, maskVars, unmaskVars } from './vars'
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
  it('masks without changing length and round-trips', () => {
    const text = '<a href="<<base>>/x">Hi <<user.name>>!</a>'
    const masked = maskVars(text)
    expect(masked).toHaveLength(text.length)
    expect(masked).not.toContain('<<')
    expect(unmaskVars(masked)).toBe(text)
  })

  it('finds variables with their ranges', () => {
    expect(findVars('x <<a>> y << b_2 >>')).toEqual([
      { name: 'a', from: 2, to: 7 },
      { name: 'b_2', from: 10, to: 19 },
    ])
  })

  it('ignores things that are not variables', () => {
    expect(findVars('<<1abc>> << >> <a>')).toEqual([])
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
    expect(parseXml('  \n')).toEqual({ nodes: [], root: null, errors: [] })
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

  it('edits, adds and removes attributes', () => {
    const item = child(root(text))
    expect(apply(text, setAttr(item.attrs[0], '"2"'))).toContain(
      'id="&quot;2&quot;"',
    )
    expect(apply(text, addAttr(item, 'new', 'v'))).toContain(
      '<item id="1" kind="a" new="v">',
    )
    expect(apply(text, removeAttr(item, item.attrs[0]))).toContain(
      '<item kind="a">',
    )
    expect(addAttr(item, 'id')).toEqual([])
    expect(addAttr(item, '1bad')).toEqual([])
  })

  it('renames open and close tags together', () => {
    const item = child(root(text))
    expect(apply(text, renameElement(item, 'entry'))).toContain(
      '<entry id="1" kind="a">old</entry>',
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
