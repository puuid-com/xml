import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

// Colours come from CSS tokens, so one theme serves light and dark.
const theme = EditorView.theme({
  '&': {
    height: '100%',
    // Keeps gutter and marker z-indexes from escaping above dialogs.
    isolation: 'isolate',
    fontSize: '13px',
    color: 'var(--foreground)',
    backgroundColor: 'var(--background)',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.65',
  },
  '.cm-content': { caretColor: 'var(--foreground)', padding: '12px 0' },
  '.cm-line': { padding: '0 16px 0 8px' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--foreground)' },
  '&.cm-focused': { outline: 'none' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
    { backgroundColor: 'var(--syntax-selection)' },
  '.cm-activeLine': { backgroundColor: 'var(--syntax-active-line)' },
  '.cm-gutters': {
    backgroundColor: 'var(--background)',
    color: 'var(--syntax-gutter)',
    border: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--foreground)',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 16px' },
  '.cm-foldGutter .cm-gutterElement': {
    color: 'var(--syntax-gutter)',
    cursor: 'pointer',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--muted)',
    border: 'none',
    color: 'var(--muted-foreground)',
    padding: '0 6px',
    borderRadius: '9999px',
  },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
    backgroundColor: 'var(--syntax-match)',
    outline: 'none',
  },
  '.cm-selectionMatch': { backgroundColor: 'var(--syntax-match)' },
  '.cm-searchMatch': {
    backgroundColor: 'color-mix(in oklch, var(--hl-amber) 30%, transparent)',
    outline: '1px solid color-mix(in oklch, var(--hl-amber) 60%, transparent)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'color-mix(in oklch, var(--hl-amber) 55%, transparent)',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--popover)',
    color: 'var(--popover-foreground)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '12px',
    overflow: 'hidden',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--secondary)',
    color: 'var(--foreground)',
  },
  '.cm-diagnostic': { padding: '6px 10px', borderLeftWidth: '3px' },
  '.cm-diagnostic-error': { borderLeftColor: 'var(--destructive)' },
  '.cm-lintRange-error': {
    backgroundImage: 'none',
    textDecoration: 'underline wavy var(--destructive)',
    textUnderlineOffset: '3px',
    textDecorationSkipInk: 'none',
  },
  '.cm-lint-marker-error': { content: 'none' },
  '.cm-panels': {
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
  },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--border)' },
  '.cm-panels.cm-panels-bottom': { borderTop: '1px solid var(--border)' },
  '.cm-panel.cm-search': {
    padding: '8px 12px',
    fontFamily: 'var(--font-sans)',
    fontSize: '12px',
  },
  '.cm-panel.cm-search input, .cm-panel.cm-search button': {
    fontSize: '12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--input)',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    backgroundImage: 'none',
  },
  // Ticks over the scrollbar track where highlighted tags open.
  '.cm-hl-markers': {
    position: 'absolute',
    top: '0',
    right: '0',
    bottom: '0',
    width: '6px',
    pointerEvents: 'none',
    zIndex: '201',
  },
  '.cm-hl-markers > div': {
    position: 'absolute',
    left: '0',
    right: '0',
    height: '2px',
  },
})

const highlightStyle = HighlightStyle.define([
  // Leaf colour; tags that contain elements are re-inked by `parentTags`.
  { tag: t.tagName, color: 'var(--syntax-leaf)' },
  { tag: t.attributeName, color: 'var(--syntax-attr)' },
  { tag: t.attributeValue, color: 'var(--syntax-value)' },
  { tag: [t.angleBracket, t.definitionOperator], color: 'var(--syntax-punct)' },
  { tag: t.character, color: 'var(--syntax-entity)' },
  { tag: t.blockComment, color: 'var(--syntax-comment)', fontStyle: 'italic' },
  {
    tag: [t.processingInstruction, t.documentMeta, t.special(t.string)],
    color: 'var(--syntax-meta)',
  },
  { tag: t.invalid, color: 'var(--destructive)' },
  // JSON
  { tag: t.propertyName, color: 'var(--syntax-leaf)' },
  { tag: t.string, color: 'var(--syntax-value)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--syntax-attr)' },
  {
    tag: [t.separator, t.brace, t.squareBracket],
    color: 'var(--syntax-punct)',
  },
])

export const editorTheme = [theme, syntaxHighlighting(highlightStyle)]
