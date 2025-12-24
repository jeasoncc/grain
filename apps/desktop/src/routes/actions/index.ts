/**
 * @file index.ts
 * @description Actions 统一导出
 *
 * 功能说明：
 * - 导出所有节点操作 Action
 * - 导出所有工作区操作 Action
 * - 提供统一的导入入口
 */

// ============================================================================
// Node Actions
// ============================================================================

// Node actions (从新位置导入)
export {
	type CreateFileInTreeParams,
	type CreateFileInTreeResult,
	type CreateNodeParams,
	createFileInTree,
	createNode,
	deleteNode,
	ensureRootFolder,
	ensureRootFolderAsync,
	type MoveNodeParams,
	moveNode,
	type RenameNodeParams,
	type ReorderNodesParams,
	renameNode,
	reorderNodes,
} from "@/actions/node";
// 创建日记
export {
	type CreateDiaryParams,
	createDiary,
	createDiaryAsync,
	DIARY_ROOT_FOLDER,
	type DiaryCreationResult,
} from "./create-diary.action";

// ============================================================================
// Workspace Actions
// ============================================================================

// Workspace actions (从新位置导入)
export {
	type CreateWorkspaceParams,
	createWorkspace,
	deleteWorkspace,
	type UpdateWorkspaceParams,
	updateWorkspace,
} from "@/actions/workspace";

// ============================================================================
// Drawing Actions
// ============================================================================

// Drawing actions (从新位置导入)
export {
	type CreateDrawingParams,
	createDrawing,
	createDrawingAsync,
	deleteDrawing,
	renameDrawing,
	type SaveDrawingContentParams,
	saveDrawingContent,
} from "@/actions/drawing";

// ============================================================================
// Export Actions
// ============================================================================

// Export actions (从新位置导入)
export {
	exportAll,
	exportAllAsync,
	exportAllAsZip,
	exportAllAsZipAsync,
	exportAsMarkdown,
	exportAsMarkdownAsync,
	exportContentToJson,
	exportContentToMarkdown,
	exportContentToOrgmode,
	exportNodeToJson,
	exportNodeToMarkdown,
	exportNodeToOrgmode,
	type ExportJsonParams,
	type ExportMarkdownParams,
	type ExportOrgmodeParams,
	type ExportResult,
} from "@/actions/export";

// ============================================================================
// Import Actions
// ============================================================================

// 导入 JSON 备份
export { importFromJson, importFromJsonAsync } from "./import-json.action";
// 导入 Markdown
export {
	type ImportMarkdownParams,
	type ImportResult,
	importMarkdown,
	importMarkdownToJson,
} from "./import-markdown.action";
