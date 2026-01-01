/**
 * Rust 后端 API 封装
 *
 * 使用 fp-ts TaskEither 封装 Tauri invoke 调用
 */

import { invoke } from "@tauri-apps/api/core";
import * as TE from "fp-ts/TaskEither";
import type { AppError } from "@/lib/error.types";
import { dbError } from "@/lib/error.types";
import type {
  BackupInfo,
  ContentResponse,
  CreateNodeRequest,
  CreateWorkspaceRequest,
  MoveNodeRequest,
  NodeResponse,
  SaveContentRequest,
  UpdateNodeRequest,
  UpdateWorkspaceRequest,
  WorkspaceResponse,
} from "@/types/rust-api";
import logger from "@/log";

// ============================================
// 工具函数
// ============================================

/**
 * 封装 Tauri invoke 调用为 TaskEither
 */
const invokeTE = <T>(
  cmd: string,
  args?: Record<string, unknown>
): TE.TaskEither<AppError, T> =>
  TE.tryCatch(
    async () => {
      logger.info(`[RustAPI] 调用: ${cmd}`, args);
      const result = await invoke<T>(cmd, args);
      logger.info(`[RustAPI] 成功: ${cmd}`);
      return result;
    },
    (error) => {
      logger.error(`[RustAPI] 失败: ${cmd}`, error);
      return dbError(`${cmd} 失败: ${error}`);
    }
  );

// ============================================
// Workspace API
// ============================================

/** 获取所有工作区 */
export const getWorkspaces = (): TE.TaskEither<AppError, WorkspaceResponse[]> =>
  invokeTE("get_workspaces");

/** 获取单个工作区 */
export const getWorkspace = (
  id: string
): TE.TaskEither<AppError, WorkspaceResponse | null> =>
  invokeTE("get_workspace", { id });

/** 创建工作区 */
export const createWorkspace = (
  request: CreateWorkspaceRequest
): TE.TaskEither<AppError, WorkspaceResponse> =>
  invokeTE("create_workspace", { request });

/** 更新工作区 */
export const updateWorkspace = (
  id: string,
  request: UpdateWorkspaceRequest
): TE.TaskEither<AppError, WorkspaceResponse> =>
  invokeTE("update_workspace", { id, request });

/** 删除工作区 */
export const deleteWorkspace = (id: string): TE.TaskEither<AppError, void> =>
  invokeTE("delete_workspace", { id });

// ============================================
// Node API
// ============================================

/** 获取工作区下的所有节点 */
export const getNodesByWorkspace = (
  workspaceId: string
): TE.TaskEither<AppError, NodeResponse[]> =>
  invokeTE("get_nodes_by_workspace", { workspaceId });

/** 获取单个节点 */
export const getNode = (
  id: string
): TE.TaskEither<AppError, NodeResponse | null> => invokeTE("get_node", { id });

/** 获取子节点 */
export const getChildNodes = (
  parentId: string
): TE.TaskEither<AppError, NodeResponse[]> =>
  invokeTE("get_child_nodes", { parentId });

/** 创建节点 */
export const createNode = (
  request: CreateNodeRequest
): TE.TaskEither<AppError, NodeResponse> =>
  invokeTE("create_node", { request });

/** 更新节点 */
export const updateNode = (
  id: string,
  request: UpdateNodeRequest
): TE.TaskEither<AppError, NodeResponse> =>
  invokeTE("update_node", { id, request });

/** 移动节点 */
export const moveNode = (
  id: string,
  request: MoveNodeRequest
): TE.TaskEither<AppError, NodeResponse> =>
  invokeTE("move_node", { id, request });

/** 删除节点 */
export const deleteNode = (id: string): TE.TaskEither<AppError, void> =>
  invokeTE("delete_node", { id });

/** 复制节点 */
export const duplicateNode = (
  id: string,
  newTitle?: string
): TE.TaskEither<AppError, NodeResponse> =>
  invokeTE("duplicate_node", { id, newTitle });

/** 获取根节点（parent_id 为 null） */
export const getRootNodes = (
  workspaceId: string
): TE.TaskEither<AppError, NodeResponse[]> =>
  invokeTE("get_root_nodes", { workspaceId });

/** 按父节点获取子节点（支持 null 表示根节点） */
export const getNodesByParent = (
  workspaceId: string,
  parentId: string | null
): TE.TaskEither<AppError, NodeResponse[]> =>
  invokeTE("get_nodes_by_parent", { workspaceId, parentId });

/** 按类型获取节点 */
export const getNodesByType = (
  workspaceId: string,
  nodeType: string
): TE.TaskEither<AppError, NodeResponse[]> =>
  invokeTE("get_nodes_by_type", { workspaceId, nodeType });

/** 获取节点的所有后代 */
export const getDescendants = (
  nodeId: string
): TE.TaskEither<AppError, NodeResponse[]> =>
  invokeTE("get_descendants", { nodeId });

/** 获取下一个排序号 */
export const getNextSortOrder = (
  workspaceId: string,
  parentId: string | null
): TE.TaskEither<AppError, number> =>
  invokeTE("get_next_sort_order", { workspaceId, parentId });

/** 批量重排序节点 */
export const reorderNodes = (
  nodeIds: string[]
): TE.TaskEither<AppError, void> =>
  invokeTE("reorder_nodes", { nodeIds });

/** 批量删除节点 */
export const deleteNodesBatch = (
  nodeIds: string[]
): TE.TaskEither<AppError, void> =>
  invokeTE("delete_nodes_batch", { nodeIds });

// ============================================
// Content API
// ============================================

/** 获取节点内容 */
export const getContent = (
  nodeId: string
): TE.TaskEither<AppError, ContentResponse | null> =>
  invokeTE("get_content", { nodeId });

/** 保存内容 */
export const saveContent = (
  request: SaveContentRequest
): TE.TaskEither<AppError, ContentResponse> =>
  invokeTE("save_content", { request });

/** 获取内容版本号 */
export const getContentVersion = (
  nodeId: string
): TE.TaskEither<AppError, number | null> =>
  invokeTE("get_content_version", { nodeId });

// ============================================
// Backup API
// ============================================

/** 创建备份 */
export const createBackup = (): TE.TaskEither<AppError, BackupInfo> =>
  invokeTE("create_backup");

/** 恢复备份 */
export const restoreBackup = (
  backupPath: string
): TE.TaskEither<AppError, void> => invokeTE("restore_backup", { backupPath });

/** 列出所有备份 */
export const listBackups = (): TE.TaskEither<AppError, BackupInfo[]> =>
  invokeTE("list_backups");

/** 删除备份 */
export const deleteBackup = (
  backupPath: string
): TE.TaskEither<AppError, void> => invokeTE("delete_backup", { backupPath });

/** 清理旧备份 */
export const cleanupOldBackups = (
  keepCount: number
): TE.TaskEither<AppError, number> =>
  invokeTE("cleanup_old_backups", { keepCount });

// ============================================
// 兼容性 API (Promise 版本)
// ============================================

/** 获取所有工作区 (Promise 版本) */
export const getWorkspacesAsync = (): Promise<WorkspaceResponse[]> =>
  invoke("get_workspaces");

/** 获取工作区节点 (Promise 版本) */
export const getNodesByWorkspaceAsync = (
  workspaceId: string
): Promise<NodeResponse[]> =>
  invoke("get_nodes_by_workspace", { workspaceId });

/** 创建节点 (Promise 版本) */
export const createNodeAsync = (
  request: CreateNodeRequest
): Promise<NodeResponse> => invoke("create_node", { request });

/** 保存内容 (Promise 版本) */
export const saveContentAsync = (
  request: SaveContentRequest
): Promise<ContentResponse> => invoke("save_content", { request });

/** 获取内容 (Promise 版本) */
export const getContentAsync = (
  nodeId: string
): Promise<ContentResponse | null> => invoke("get_content", { nodeId });

/** 获取根节点 (Promise 版本) */
export const getRootNodesAsync = (
  workspaceId: string
): Promise<NodeResponse[]> => invoke("get_root_nodes", { workspaceId });

/** 按父节点获取子节点 (Promise 版本) */
export const getNodesByParentAsync = (
  workspaceId: string,
  parentId: string | null
): Promise<NodeResponse[]> =>
  invoke("get_nodes_by_parent", { workspaceId, parentId });

/** 按类型获取节点 (Promise 版本) */
export const getNodesByTypeAsync = (
  workspaceId: string,
  nodeType: string
): Promise<NodeResponse[]> =>
  invoke("get_nodes_by_type", { workspaceId, nodeType });

/** 获取节点的所有后代 (Promise 版本) */
export const getDescendantsAsync = (
  nodeId: string
): Promise<NodeResponse[]> => invoke("get_descendants", { nodeId });

/** 获取下一个排序号 (Promise 版本) */
export const getNextSortOrderAsync = (
  workspaceId: string,
  parentId: string | null
): Promise<number> => invoke("get_next_sort_order", { workspaceId, parentId });

/** 批量重排序节点 (Promise 版本) */
export const reorderNodesAsync = (
  nodeIds: string[]
): Promise<void> => invoke("reorder_nodes", { nodeIds });

/** 批量删除节点 (Promise 版本) */
export const deleteNodesBatchAsync = (
  nodeIds: string[]
): Promise<void> => invoke("delete_nodes_batch", { nodeIds });
