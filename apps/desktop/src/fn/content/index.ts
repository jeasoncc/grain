/**
 * @file fn/content/index.ts
 * @description 内容模板纯函数模块导出
 *
 * 本模块提供：
 * - 四种模板类型：diary、todo、ledger、wiki
 * - 统一目录结构生成
 * - Lexical JSON 内容生成
 * - Excalidraw JSON 内容生成
 * - 内容解析和提取
 */

// 内容提取
export {
	extractText,
	extractTextFromJson,
	extractTextWithNewlines,
	type LexicalNode,
} from "./content.extract.fn";
// Lexical JSON 内容生成
export {
	// Types
	type ContentGenerationOptions,
	// Node Creation Functions
	createDocument,
	createHeadingNode,
	createListItemNode,
	createListNode,
	createParagraphNode,
	createTagNode,
	createTagsLine,
	createTextNode,
	// Content Parsing Functions
	extractTagsFromDocument,
	extractTextFromDocument,
	// Date Formatting Functions
	formatFullDateTime,
	formatShortDate,
	// Content Generation Functions
	generateContentByType,
	generateDiaryContent,
	generateLedgerContent,
	generateNoteContent,
	generateTodoContent,
	generateWikiContent,
	type LexicalDocument,
	type LexicalHeadingNode,
	type LexicalListItemNode,
	type LexicalListNode,
	type LexicalParagraphNode,
	type LexicalRootChild,
	type LexicalRootNode,
	type LexicalTagNode,
	type LexicalTextNode,
	parseContent,
} from "./content.generate.fn";
// 模板配置和文件结构生成
export {
	// Functions
	buildFileCreationParams,
	createCustomTemplate,
	// Constants
	DIARY_TEMPLATE,
	// Types
	type FileCreationParams,
	type FileStructure,
	generateFilename,
	generateFileStructure,
	generateFileStructureByType,
	getAvailableTemplateTypes,
	getTemplateConfig,
	isValidTemplateType,
	LEDGER_TEMPLATE,
	TEMPLATE_CONFIGS,
	type TemplateConfig,
	type TemplateType,
	TODO_TEMPLATE,
	WIKI_TEMPLATE,
} from "./content.template.fn";
// 图表内容生成（Mermaid/PlantUML）
export {
	generateMermaidContent,
	generatePlantUMLContent,
} from "./diagram.content.fn";
// Excalidraw 内容生成
export {
	// Functions
	createDefaultAppState,
	createExcalidrawDocument,
	// Constants
	DEFAULT_HEIGHT,
	DEFAULT_WIDTH,
	EXCALIDRAW_SOURCE,
	EXCALIDRAW_VERSION,
	// Types
	type ExcalidrawAppState,
	type ExcalidrawContentParams,
	type ExcalidrawDocument,
	type ExcalidrawElement,
	type ExcalidrawFiles,
	type ExcalidrawZoom,
	generateExcalidrawContent,
	isValidExcalidrawContent,
	parseExcalidrawContent,
} from "./excalidraw.content.fn";
