/**
 * @file pipes/content/index.ts
 * @description Content pipes module exports
 */

export { generateCodeContent } from "./code.content.fn"
export type {
	ContentGenerationOptions,
	LexicalDocument,
	LexicalHeadingNode,
	LexicalListItemNode,
	LexicalListNode,
	LexicalParagraphNode,
	LexicalRootChild,
	LexicalRootNode,
	LexicalTagNode,
	LexicalTextNode,
} from "./content.generate.fn"
export {
	createDocument,
	createHeadingNode,
	createListItemNode,
	createListNode,
	createParagraphNode,
	createTagNode,
	createTagsLine,
	createTextNode,
	extractTagsFromDocument,
	extractTextFromDocument,
	formatFullDateTime,
	formatShortDate,
	generateContentByType,
	generateDiaryContent,
	generateLedgerContent,
	generateNoteContent,
	generateTodoContent,
	generateWikiContent,
	parseContent,
} from "./content.generate.fn"
export { generateMermaidContent, generatePlantUMLContent } from "./diagram.content.fn"

export type {
	ExcalidrawAppState,
	ExcalidrawContentParams,
	ExcalidrawDocument,
} from "./excalidraw.content.fn"
export {
	EXCALIDRAW_SOURCE,
	EXCALIDRAW_VERSION,
	generateExcalidrawContent,
	isValidExcalidrawContent,
	parseExcalidrawContent,
} from "./excalidraw.content.fn"
export { generateEmptyContent, getDefaultTitle } from "./generate-empty-content.pipe"
