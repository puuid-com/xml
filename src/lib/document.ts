// One entry point for language-specific work, so the editor, tree and
// actions treat XML and JSON files the same way.

import { isFlatFile, parseFlat } from './flat/parse'
import { addJsonChild, removeJsonNode, setJsonValue } from './json/edit'
import { formatJson } from './json/format'
import { parseJson } from './json/parse'
import { defaultChanges } from './xml/defaults'
import { addChild, removeNode, setText } from './xml/edit'
import { formatXml } from './xml/format'
import { elementByPath } from './xml/locate'
import { isElement } from './xml/model'
import { parseXml } from './xml/parse'
import type { DefaultRule } from './xml/defaults'
import type { TextChange } from './xml/edit'
import type { FormatOptions, FormatResult } from './xml/format'
import type { DocLanguage, XmlDocument, XmlElement } from './xml/model'

export type { DocLanguage }

const JSON_EXT = /\.(json|geojson|jsonld|webmanifest|har|ipynb)$/i
const XML_EXT =
  /\.(xml|xsd|xsl|xslt|wsdl|svg|plist|config|csproj|xaml|rss|atom|kml|gpx)$/i

/** By extension, else by the first character of the content. */
export function languageOf(name: string, content: string): DocLanguage {
  // A flat file is never valid XML or JSON, so its content beats the name.
  if (isFlatFile(content)) return 'flat'
  if (JSON_EXT.test(name)) return 'json'
  if (XML_EXT.test(name)) return 'xml'
  return /^\s*[[{]/.test(content) ? 'json' : 'xml'
}

export function parseDocument(
  text: string,
  language: DocLanguage,
): XmlDocument {
  if (language === 'flat') {
    return {
      language,
      nodes: [],
      root: null,
      errors: [],
      flat: parseFlat(text),
    }
  }
  return language === 'json' ? parseJson(text) : parseXml(text)
}

export function formatDocument(
  text: string,
  language: DocLanguage,
  options: FormatOptions,
): FormatResult {
  // Fixed-width fields are already aligned.
  if (language === 'flat') return { ok: true, text }
  return language === 'json'
    ? formatJson(text, options)
    : formatXml(text, options)
}

export function setValue(el: XmlElement, value: string): Array<TextChange> {
  return el.json ? setJsonValue(el, value) : setText(el, value)
}

/** Whether `addChildTo` can add anything to `el`. */
export function canAddChild(el: XmlElement) {
  return !el.json || el.json.type === 'object' || el.json.type === 'array'
}

export function addChildTo(
  text: string,
  el: XmlElement,
  name: string,
): Array<TextChange> {
  return el.json ? addJsonChild(text, el, name) : addChild(text, el, name)
}

export function removeElement(
  text: string,
  el: XmlElement,
  doc: XmlDocument,
): Array<TextChange> {
  if (!el.json) return removeNode(text, el)
  const parentPath = el.path.slice(0, el.path.lastIndexOf('/'))
  const level = parentPath
    ? (elementByPath(doc.nodes, parentPath)?.children ?? [])
    : doc.nodes
  return removeJsonNode(text, el, level.filter(isElement))
}

export function documentDefaults(
  doc: XmlDocument,
  rules: ReadonlyArray<DefaultRule>,
) {
  return defaultChanges(doc.nodes, rules, setValue)
}

export const MIME_TYPES: Record<DocLanguage, string> = {
  xml: 'application/xml',
  json: 'application/json',
  flat: 'text/plain',
}
