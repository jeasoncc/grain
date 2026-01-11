/**
 * @file backup.repo.fn.ts
 * @description Backup Repository - Rust 后端备份操作封装
 *
 * 功能说明：
 * - 封装 Rust 后端的备份 API 调用
 * - 使用 TaskEither 返回类型进行错误处理
 * - 提供类型安全的备份操作接口
 *
 * @requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import type * as TE from "fp-ts/TaskEither";
import type { AppError } from "@/types/error";
import type { BackupInfo } from "@/types/rust-api";
import { api } from "./client.api";

// ============================================================================
// 备份操作
// ============================================================================

/**
 * 创建备份
 *
 * @returns TaskEither<AppError, BackupInfo>
 */
export const createBackup = (): TE.TaskEither<AppError, BackupInfo> =>
	api.createBackup();

/**
 * 恢复备份
 *
 * @param backupPath - 备份文件路径
 * @returns TaskEither<AppError, void>
 */
export const restoreBackup = (
	backupPath: string,
): TE.TaskEither<AppError, void> => api.restoreBackup(backupPath);

/**
 * 列出所有备份
 *
 * @returns TaskEither<AppError, BackupInfo[]>
 */
export const listBackups = (): TE.TaskEither<AppError, BackupInfo[]> =>
	api.listBackups();

/**
 * 删除备份
 *
 * @param backupPath - 备份文件路径
 * @returns TaskEither<AppError, void>
 */
export const deleteBackup = (
	backupPath: string,
): TE.TaskEither<AppError, void> => api.deleteBackup(backupPath);

/**
 * 清理旧备份
 *
 * @param keepCount - 保留的备份数量
 * @returns TaskEither<AppError, number> - 删除的备份数量
 */
export const cleanupOldBackups = (
	keepCount: number,
): TE.TaskEither<AppError, number> => api.cleanupOldBackups(keepCount);
