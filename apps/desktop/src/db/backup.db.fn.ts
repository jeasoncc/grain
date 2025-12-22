/**
 * @file backup.db.fn.ts
 * @description 数据库备份与恢复函数
 *
 * 功能说明：
 * - 创建完整数据库备份
 * - 导出备份到 JSON/ZIP 文件
 * - 从文件恢复备份
 * - 获取数据库统计信息
 * - 自动备份管理
 *
 * 数据库表：
 * - users: 用户信息
 * - workspaces: 工作区元数据
 * - nodes: 文件树结构
 * - contents: 文档内容
 * - drawings: Excalidraw 绘图
 * - attachments: 文件附件
 * - tags: 标签聚合缓存
 * - dbVersions: 数据库版本跟踪
 *
 * @requirements 6.2
 */

import dayjs from "dayjs";
import { saveAs } from "file-saver";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import JSZip from "jszip";
import { type AppError, dbError, importError } from "@/lib/error.types";
import logger from "@/log";
import type {
	BackupData,
	BackupMetadata,
	DatabaseStats,
	LocalBackupRecord,
} from "@/types/backup";
import { database } from "./database";

// ============================================================================
// 备份操作
// ============================================================================

/**
 * 创建完整数据库备份
 *
 * @returns TaskEither<AppError, BackupData>
 */
export const createBackup = (): TE.TaskEither<AppError, BackupData> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 创建备份...");

			const [
				users,
				workspaces,
				nodes,
				contents,
				drawings,
				attachments,
				tags,
				dbVersions,
			] = await Promise.all([
				database.users.toArray(),
				database.workspaces.toArray(),
				database.nodes.toArray(),
				database.contents.toArray(),
				database.drawings.toArray(),
				database.attachments.toArray(),
				database.tags.toArray(),
				database.dbVersions.toArray(),
			]);

			const backup: BackupData = {
				metadata: {
					version: "5.0.0",
					timestamp: dayjs().toISOString(),
					projectCount: workspaces.length,
					nodeCount: nodes.length,
					contentCount: contents.length,
					tagCount: tags.length,
					appVersion: "0.1.89",
				},
				users,
				workspaces,
				nodes,
				contents,
				drawings,
				attachments,
				tags,
				dbVersions,
			};

			logger.success(
				`[DB] 备份创建成功: ${workspaces.length} 工作区, ${nodes.length} 节点, ${contents.length} 内容`,
			);
			return backup;
		},
		(error): AppError => {
			logger.error("[DB] 创建备份失败:", error);
			return dbError(`创建备份失败: ${error}`);
		},
	);

/**
 * 导出备份到 JSON 文件
 *
 * @returns TaskEither<AppError, string> - 导出的文件名
 */
export const exportBackupJson = (): TE.TaskEither<AppError, string> =>
	pipe(
		TE.Do,
		TE.tap(() =>
			TE.fromIO(() => {
				logger.info("[DB] 导出 JSON 备份...");
			}),
		),
		TE.bind("backup", () => createBackup()),
		TE.chain(({ backup }) =>
			TE.tryCatch(
				async () => {
					const json = JSON.stringify(backup, null, 2);
					const blob = new Blob([json], { type: "application/json" });
					const filename = `grain-backup-${dayjs().format("YYYY-MM-DD-HHmmss")}.json`;

					saveAs(blob, filename);
					logger.success(`[DB] 备份已导出: ${filename}`);
					return filename;
				},
				(error): AppError => {
					logger.error("[DB] 导出 JSON 备份失败:", error);
					return dbError(`导出 JSON 备份失败: ${error}`);
				},
			),
		),
	);

/**
 * 导出备份到 ZIP 文件
 *
 * @returns TaskEither<AppError, string> - 导出的文件名
 */
export const exportBackupZip = (): TE.TaskEither<AppError, string> =>
	pipe(
		TE.Do,
		TE.tap(() =>
			TE.fromIO(() => {
				logger.info("[DB] 导出 ZIP 备份...");
			}),
		),
		TE.bind("backup", () => createBackup()),
		TE.chain(({ backup }) =>
			TE.tryCatch(
				async () => {
					const zip = new JSZip();

					zip.file("backup.json", JSON.stringify(backup, null, 2));
					zip.file(
						"README.txt",
						`Grain Editor Backup
Created: ${backup.metadata.timestamp}
Workspaces: ${backup.metadata.projectCount}
Nodes: ${backup.metadata.nodeCount}
Contents: ${backup.metadata.contentCount}
Tags: ${backup.metadata.tagCount}
App Version: ${backup.metadata.appVersion}

How to restore:
1. Open Grain Editor
2. Go to Settings -> Data Management
3. Click "Restore Backup"
4. Select this file
`,
					);

					const blob = await zip.generateAsync({
						type: "blob",
						compression: "DEFLATE",
						compressionOptions: { level: 9 },
					});

					const filename = `grain-backup-${dayjs().format("YYYY-MM-DD-HHmmss")}.zip`;
					saveAs(blob, filename);
					logger.success(`[DB] 压缩备份已导出: ${filename}`);
					return filename;
				},
				(error): AppError => {
					logger.error("[DB] 导出 ZIP 备份失败:", error);
					return dbError(`导出 ZIP 备份失败: ${error}`);
				},
			),
		),
	);

// ============================================================================
// 恢复操作
// ============================================================================

/**
 * 从文件恢复备份
 *
 * @param file - 备份文件（JSON 或 ZIP）
 * @returns TaskEither<AppError, void>
 */
export const restoreBackup = (file: File): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 恢复备份...");

			let backupData: BackupData;

			if (file.name.endsWith(".zip")) {
				const zip = await JSZip.loadAsync(file);
				const backupFile = zip.file("backup.json");
				if (!backupFile) {
					throw new Error("无效的备份文件: 未找到 backup.json");
				}
				const content = await backupFile.async("string");
				backupData = JSON.parse(content);
			} else {
				const content = await file.text();
				backupData = JSON.parse(content);
			}

			if (!backupData.metadata) {
				throw new Error("无效的备份文件格式");
			}

			// 处理旧版备份格式（projects -> workspaces）
			const workspacesData = backupData.workspaces || backupData.projects || [];

			await database.transaction(
				"rw",
				[
					database.users,
					database.workspaces,
					database.nodes,
					database.contents,
					database.drawings,
					database.attachments,
					database.tags,
					database.dbVersions,
				],
				async () => {
					if (backupData.users?.length)
						await database.users.bulkPut(backupData.users as never[]);
					if (workspacesData.length)
						await database.workspaces.bulkPut(workspacesData as never[]);
					if (backupData.nodes?.length)
						await database.nodes.bulkPut(backupData.nodes as never[]);
					if (backupData.contents?.length)
						await database.contents.bulkPut(backupData.contents as never[]);
					if (backupData.drawings?.length)
						await database.drawings.bulkPut(backupData.drawings as never[]);
					if (backupData.attachments?.length)
						await database.attachments.bulkPut(
							backupData.attachments as never[],
						);
					if (backupData.tags?.length)
						await database.tags.bulkPut(backupData.tags as never[]);
					if (backupData.dbVersions?.length)
						await database.dbVersions.bulkPut(backupData.dbVersions as never[]);
				},
			);

			logger.success(`[DB] 备份恢复成功: ${workspacesData.length} 工作区`);
		},
		(error): AppError => {
			logger.error("[DB] 恢复备份失败:", error);
			return importError(`恢复备份失败: ${error}`);
		},
	);

/**
 * 从备份数据恢复（不从文件读取）
 *
 * @param backupData - 备份数据
 * @returns TaskEither<AppError, void>
 */
export const restoreBackupData = (
	backupData: BackupData,
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 从数据恢复备份...");

			if (!backupData.metadata) {
				throw new Error("无效的备份数据格式");
			}

			const workspacesData = backupData.workspaces || backupData.projects || [];

			await database.transaction(
				"rw",
				[
					database.users,
					database.workspaces,
					database.nodes,
					database.contents,
					database.drawings,
					database.attachments,
					database.tags,
				],
				async () => {
					if (backupData.users?.length)
						await database.users.bulkPut(backupData.users as never[]);
					if (workspacesData.length)
						await database.workspaces.bulkPut(workspacesData as never[]);
					if (backupData.nodes?.length)
						await database.nodes.bulkPut(backupData.nodes as never[]);
					if (backupData.contents?.length)
						await database.contents.bulkPut(backupData.contents as never[]);
					if (backupData.drawings?.length)
						await database.drawings.bulkPut(backupData.drawings as never[]);
					if (backupData.attachments?.length)
						await database.attachments.bulkPut(
							backupData.attachments as never[],
						);
					if (backupData.tags?.length)
						await database.tags.bulkPut(backupData.tags as never[]);
				},
			);

			logger.success(`[DB] 备份数据恢复成功: ${workspacesData.length} 工作区`);
		},
		(error): AppError => {
			logger.error("[DB] 恢复备份数据失败:", error);
			return importError(`恢复备份数据失败: ${error}`);
		},
	);

// ============================================================================
// 统计操作
// ============================================================================

/**
 * 获取数据库统计信息
 *
 * @returns TaskEither<AppError, DatabaseStats>
 */
export const getDatabaseStats = (): TE.TaskEither<AppError, DatabaseStats> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取数据库统计信息...");

			const [
				userCount,
				projectCount,
				nodeCount,
				contentCount,
				drawingCount,
				attachmentCount,
				tagCount,
			] = await Promise.all([
				database.users.count(),
				database.workspaces.count(),
				database.nodes.count(),
				database.contents.count(),
				database.drawings.count(),
				database.attachments.count(),
				database.tags.count(),
			]);

			return {
				userCount,
				projectCount,
				nodeCount,
				contentCount,
				drawingCount,
				attachmentCount,
				tagCount,
			};
		},
		(error): AppError => {
			logger.error("[DB] 获取数据库统计信息失败:", error);
			return dbError(`获取数据库统计信息失败: ${error}`);
		},
	);

// ============================================================================
// 本地备份管理
// ============================================================================

const LOCAL_BACKUPS_KEY = "auto-backups";
const LAST_BACKUP_KEY = "last-auto-backup";

/**
 * 获取本地存储的备份列表
 *
 * @returns LocalBackupRecord[]
 */
export const getLocalBackups = (): LocalBackupRecord[] => {
	try {
		const stored = localStorage.getItem(LOCAL_BACKUPS_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
};

/**
 * 保存备份到本地存储
 *
 * @param backup - 备份数据
 * @param maxBackups - 最大保留备份数量
 * @returns TaskEither<AppError, void>
 */
export const saveLocalBackup = (
	backup: BackupData,
	maxBackups = 3,
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 保存本地备份...");

			const backups = getLocalBackups();
			backups.unshift({ timestamp: backup.metadata.timestamp, data: backup });

			const recentBackups = backups.slice(0, maxBackups);
			localStorage.setItem(LOCAL_BACKUPS_KEY, JSON.stringify(recentBackups));
			localStorage.setItem(LAST_BACKUP_KEY, backup.metadata.timestamp);

			logger.success(`[DB] 本地备份保存成功: ${backup.metadata.timestamp}`);
		},
		(error): AppError => {
			logger.error("[DB] 保存本地备份失败:", error);
			return dbError(`保存本地备份失败: ${error}`);
		},
	);

/**
 * 从本地存储恢复备份
 *
 * @param timestamp - 备份时间戳
 * @returns TaskEither<AppError, void>
 */
export const restoreLocalBackup = (
	timestamp: string,
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 恢复本地备份:", timestamp);

			const backups = getLocalBackups();
			const backup = backups.find((b) => b.timestamp === timestamp);

			if (!backup) {
				throw new Error(`未找到备份: ${timestamp}`);
			}

			const result = await restoreBackupData(backup.data)();
			if (result._tag === "Left") {
				throw new Error(result.left.message);
			}

			logger.success(`[DB] 本地备份恢复成功: ${timestamp}`);
		},
		(error): AppError => {
			logger.error("[DB] 恢复本地备份失败:", error);
			return importError(`恢复本地备份失败: ${error}`);
		},
	);

/**
 * 获取上次备份时间
 *
 * @returns string | null
 */
export const getLastBackupTime = (): string | null => {
	return localStorage.getItem(LAST_BACKUP_KEY);
};

/**
 * 检查是否需要自动备份（距离上次备份超过指定小时数）
 *
 * @param intervalHours - 备份间隔小时数
 * @returns boolean
 */
export const shouldAutoBackup = (intervalHours = 24): boolean => {
	const lastBackup = getLastBackupTime();
	if (!lastBackup) return true;

	const lastTime = dayjs(lastBackup);
	const now = dayjs();
	return now.diff(lastTime, "hour") >= intervalHours;
};

/**
 * 执行自动备份（如果需要）
 *
 * @param intervalHours - 备份间隔小时数
 * @returns TaskEither<AppError, boolean> - 是否执行了备份
 */
export const performAutoBackup = (
	intervalHours = 24,
): TE.TaskEither<AppError, boolean> => {
	// 检查是否需要备份
	if (!shouldAutoBackup(intervalHours)) {
		logger.info("[DB] 距离上次备份不足 24 小时，跳过自动备份");
		return TE.right(false);
	}

	// 执行备份流程
	return pipe(
		createBackup(),
		TE.chain((backup) =>
			pipe(
				saveLocalBackup(backup),
				TE.map(() => {
					logger.success(`[DB] 自动备份完成: ${backup.metadata.timestamp}`);
					return true;
				}),
			),
		),
		TE.mapLeft((error) => {
			logger.error("[DB] 自动备份失败:", error);
			return error;
		}),
	);
};
