/**
 * @file pipes/content/index.ts
 * @description Content pipes module exports
 */

export {
	createDocument,
	createHeadingNode,
	createListItemNode,
	createListNode,
	createParagraphNode,
	createTagNode,
	createTagsLine,
	createTextNode,
} from "./legacy-content.pipe"

export type {
	LexicalDocument,
	LexicalHeadingNode,
	LexicalListItemNode,
	LexicalListNode,
	LexicalParagraphNode,
	LexicalRootChild,
	LexicalRootNode,
	LexicalTagNode,
	LexicalTextNode,
} from "./legacy-content.pipe"

export { generateMermaidContent, generatePlantUMLContent } from "./diagram.content.fn"

export { generateCodeContent } from "./code.content.fn"

