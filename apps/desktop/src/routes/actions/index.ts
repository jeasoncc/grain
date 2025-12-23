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
} from "./create-diary.action";
// 创建节点
export {
	type CreateFileInTreeParams,
	type CreateFileInTreeResult,
	type CreateNodeParams,
	createFileInTree,
	createNode,
} from "./create-node.action";
// 删除节点
export { deleteNode } from "./delete-node.action";
// 确保文件夹存在
export {
	ensureRootFolder,
	ensureRootFolderAsync,
} from "./ensure-folder.action";

// 移动节点
export { type MoveNodeParams, moveNode } from "./move-node.action";

// 重命名节点
export { type RenameNodeParams, renameNode } from "./rename-node.action";

// 重新排序节点
export { type ReorderNodesParams, reorderNodes } from "./reorder-node.action";

// ============================================================================
// Workspace Actions
// ============================================================================

// 创建工作区
export {
	type CreateWorkspaceParams,
	createWorkspace,
} from "./create-workspace.action";

// 删除工作区
export { deleteWorkspace } from "./delete-workspace.action";

// 更新工作区
export {
	type UpdateWorkspaceParams,
	updateWorkspace,
} from "./update-workspace.action";

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
