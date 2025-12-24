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

// 创建日记
export {
	type CreateDiaryParams,
	createDiary,
	createDiaryAsync,
	DIARY_ROOT_FOLDER,
	type DiaryCreationResult,
} from "@/actions/diary";
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
	type ExportJsonParams,
	type ExportMarkdownParams,
	type ExportOrgmodeParams,
	type ExportResult,
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
} from "@/actions/export";

// ============================================================================
// Import Actions
// ============================================================================

// Import actions (从新位置导入)
export {
	type ImportMarkdownParams,
	type ImportResult,
	importFromJson,
	importFromJsonAsync,
	importMarkdown,
	importMarkdownToJson,
} from "@/actions/import";
