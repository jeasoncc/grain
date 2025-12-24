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

// 创建绘图
export {
	type CreateDrawingParams,
	createDrawing,
	createDrawingAsync,
} from "./create-drawing.action";

// 删除绘图
export { deleteDrawing } from "./delete-drawing.action";

// 重命名绘图
export { renameDrawing } from "./rename-drawing.action";

// 保存绘图内容
export {
	type SaveDrawingContentParams,
	saveDrawingContent,
} from "./save-drawing-content.action";

// ============================================================================
// Export Actions
// ============================================================================

// 导出全部数据
export { exportAll, exportAllAsync } from "./export-all.action";
// 导出 JSON
export {
	type ExportJsonParams,
	exportContentToJson,
	exportNodeToJson,
} from "./export-json.action";
// 导出 Markdown
export {
	type ExportMarkdownParams,
	exportContentToMarkdown,
	exportNodeToMarkdown,
} from "./export-markdown.action";
// 导出结果类型（从任意导出 action 导出）
export type { ExportResult } from "./export-orgmode.action";
// 导出 Org-mode
export {
	type ExportOrgmodeParams,
	exportContentToOrgmode,
	exportNodeToOrgmode,
} from "./export-orgmode.action";
// 导出工作区为 Markdown
export {
	exportAsMarkdown,
	exportAsMarkdownAsync,
} from "./export-workspace-markdown.action";
// 导出 ZIP 压缩包
export { exportAllAsZip, exportAllAsZipAsync } from "./export-zip.action";

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
