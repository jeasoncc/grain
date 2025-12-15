/**
 * Lexical Playground Editor Theme
 *
 * Based on Lexical Playground's default theme configuration.
 * Provides CSS class name mappings for all Lexical node types.
 *
 * @see https://github.com/facebook/lexical/tree/main/packages/lexical-playground
 * @see Requirements 1.2
 */

import type { EditorThemeClasses } from 'lexical';

const theme: EditorThemeClasses = {
  // Block-level elements
  blockCursor: 'PlaygroundEditorTheme__blockCursor',
  characterLimit: 'PlaygroundEditorTheme__characterLimit',
  
  // Code blocks
  code: 'PlaygroundEditorTheme__code',
  codeHighlight: {
    atrule: 'PlaygroundEditorTheme__tokenAttr',
    attr: 'PlaygroundEditorTheme__tokenAttr',
    boolean: 'PlaygroundEditorTheme__tokenProperty',
    builtin: 'PlaygroundEditorTheme__tokenSelector',
    cdata: 'PlaygroundEditorTheme__tokenComment',
    char: 'PlaygroundEditorTheme__tokenSelector',
    class: 'PlaygroundEditorTheme__tokenFunction',
    'class-name': 'PlaygroundEditorTheme__tokenFunction',
    comment: 'PlaygroundEditorTheme__tokenComment',
    constant: 'PlaygroundEditorTheme__tokenProperty',
    deleted: 'PlaygroundEditorTheme__tokenProperty',
    doctype: 'PlaygroundEditorTheme__tokenComment',
    entity: 'PlaygroundEditorTheme__tokenOperator',
    function: 'PlaygroundEditorTheme__tokenFunction',
    important: 'PlaygroundEditorTheme__tokenVariable',
    inserted: 'PlaygroundEditorTheme__tokenSelector',
    keyword: 'PlaygroundEditorTheme__tokenAttr',
    namespace: 'PlaygroundEditorTheme__tokenVariable',
    number: 'PlaygroundEditorTheme__tokenProperty',
    operator: 'PlaygroundEditorTheme__tokenOperator',
    prolog: 'PlaygroundEditorTheme__tokenComment',
    property: 'PlaygroundEditorTheme__tokenProperty',
    punctuation: 'PlaygroundEditorTheme__tokenPunctuation',
    regex: 'PlaygroundEditorTheme__tokenVariable',
    selector: 'PlaygroundEditorTheme__tokenSelector',
    string: 'PlaygroundEditorTheme__tokenSelector',
    symbol: 'PlaygroundEditorTheme__tokenProperty',
    tag: 'PlaygroundEditorTheme__tokenProperty',
    url: 'PlaygroundEditorTheme__tokenOperator',
    variable: 'PlaygroundEditorTheme__tokenVariable',
  },
  
  // Embeds
  embedBlock: {
    base: 'PlaygroundEditorTheme__embedBlock',
    focus: 'PlaygroundEditorTheme__embedBlockFocus',
  },
  
  // Hashtag
  hashtag: 'PlaygroundEditorTheme__hashtag',
  
  // Headings
  heading: {
    h1: 'PlaygroundEditorTheme__h1',
    h2: 'PlaygroundEditorTheme__h2',
    h3: 'PlaygroundEditorTheme__h3',
    h4: 'PlaygroundEditorTheme__h4',
    h5: 'PlaygroundEditorTheme__h5',
    h6: 'PlaygroundEditorTheme__h6',
  },
  
  // Images
  image: 'editor-image',
  
  // Indent
  indent: 'PlaygroundEditorTheme__indent',
  
  // Inline images
  inlineImage: 'inline-editor-image',
  
  // Layout
  layoutContainer: 'PlaygroundEditorTheme__layoutContainer',
  layoutItem: 'PlaygroundEditorTheme__layoutItem',
  
  // Links
  link: 'PlaygroundEditorTheme__link',
  
  // Lists
  list: {
    checklist: 'PlaygroundEditorTheme__checklist',
    listitem: 'PlaygroundEditorTheme__listItem',
    listitemChecked: 'PlaygroundEditorTheme__listItemChecked',
    listitemUnchecked: 'PlaygroundEditorTheme__listItemUnchecked',
    nested: {
      listitem: 'PlaygroundEditorTheme__nestedListItem',
    },
    olDepth: [
      'PlaygroundEditorTheme__ol1',
      'PlaygroundEditorTheme__ol2',
      'PlaygroundEditorTheme__ol3',
      'PlaygroundEditorTheme__ol4',
      'PlaygroundEditorTheme__ol5',
    ],
    ul: 'PlaygroundEditorTheme__ul',
  },
  
  // LTR/RTL
  ltr: 'PlaygroundEditorTheme__ltr',
  rtl: 'PlaygroundEditorTheme__rtl',
  
  // Mark (highlight)
  mark: 'PlaygroundEditorTheme__mark',
  markOverlap: 'PlaygroundEditorTheme__markOverlap',
  
  // Paragraph
  paragraph: 'PlaygroundEditorTheme__paragraph',
  
  // Quote
  quote: 'PlaygroundEditorTheme__quote',
  
  // Table
  table: 'PlaygroundEditorTheme__table',
  tableAddColumns: 'PlaygroundEditorTheme__tableAddColumns',
  tableAddRows: 'PlaygroundEditorTheme__tableAddRows',
  tableCell: 'PlaygroundEditorTheme__tableCell',
  tableCellActionButton: 'PlaygroundEditorTheme__tableCellActionButton',
  tableCellActionButtonContainer: 'PlaygroundEditorTheme__tableCellActionButtonContainer',
  tableCellEditing: 'PlaygroundEditorTheme__tableCellEditing',
  tableCellHeader: 'PlaygroundEditorTheme__tableCellHeader',
  tableCellPrimarySelected: 'PlaygroundEditorTheme__tableCellPrimarySelected',
  tableCellResizer: 'PlaygroundEditorTheme__tableCellResizer',
  tableCellSelected: 'PlaygroundEditorTheme__tableCellSelected',
  tableCellSortedIndicator: 'PlaygroundEditorTheme__tableCellSortedIndicator',
  tableResizeRuler: 'PlaygroundEditorTheme__tableCellResizeRuler',
  tableRowStriping: 'PlaygroundEditorTheme__tableRowStriping',
  tableSelected: 'PlaygroundEditorTheme__tableSelected',
  tableSelection: 'PlaygroundEditorTheme__tableSelection',
  
  // Text formatting
  text: {
    bold: 'PlaygroundEditorTheme__textBold',
    code: 'PlaygroundEditorTheme__textCode',
    italic: 'PlaygroundEditorTheme__textItalic',
    strikethrough: 'PlaygroundEditorTheme__textStrikethrough',
    subscript: 'PlaygroundEditorTheme__textSubscript',
    superscript: 'PlaygroundEditorTheme__textSuperscript',
    underline: 'PlaygroundEditorTheme__textUnderline',
    underlineStrikethrough: 'PlaygroundEditorTheme__textUnderlineStrikethrough',
  },
};

export default theme;
