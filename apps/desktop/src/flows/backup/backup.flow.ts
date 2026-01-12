/**
 * @file flows/backup/backup.flow.ts
 * @description 数据库备份与恢复流程
 *
 * 依赖规则：flows/ 只能依赖 pipes/, io/, state/, types/
 */

import dayjs from "dayjs";
import { saveAs } from "file-saver";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import JSZip from "jszip";
import { legacyDatabase as database } from "@/io/db/legacy-database";
import type {
	BackupData,
	DatabaseStats,
	LocalBackupRecord,
} from "@/types/backup";
import { type AppError, dbError, importError } from "@/types/error";

// ============================================================================
// 备份操作
// ============================================================================

/**
 * 创建完整数据库备份
 */
export const createBackup = (): TE.TaskEither<AppError, BackupData> =>
	TE.tryCatch(
		async () => {
			const [
				users,
				workspaces,
				nodes,
				contents,
				attachments,
				tags,
				dbVersions,
			] = await Promise.all([
				database.users.toArray(),
				database.workspaces.toArray(),
				database.nodes.toArray(),
				database.contents.toArray(),
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
				drawings: [],
				attachments,
				tags,
				dbVersions,
			};

			return backup;
		},
		(error): AppError => dbError(`创建备份失败: ${error}`),
	);

/**
 * 导出备份到 JSON 文件
 */
export const exportBackupJson = (): TE.TaskEither<AppError, string> =>
	pipe(
		createBackup(),
		TE.chain((backup) =>
			TE.tryCatch(
				async () => {
					const json = JSON.stringify(backup, null, 2);
					const blob = new Blob([json], { type: "application/json" });
					const filename = `grain-backup-${dayjs().format("YYYY-MM-DD-HHmmss")}.json`;
					saveAs(blob, filename);
					return filename;
				},
				(error): AppError => dbError(`导出 JSON 备份失败: ${error}`),
			),
		),
	);

/**
 * 导出备份到 ZIP 文件
 */
export const exportBackupZip = (): TE.TaskEither<AppError, string> =>
	pipe(
		createBackup(),
		TE.chain((backup) =>
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
					return filename;
				},
				(error): AppError => dbError(`导出 ZIP 备份失败: ${error}`),
			),
		),
	);

// ============================================================================
// 恢复操作
// ============================================================================

/**
 * 从文件恢复备份
 */
export const restoreBackup = (file: File): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
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

			const workspacesData = backupData.workspaces || backupData.projects || [];

			await database.transaction(
				"rw",
				[
					database.users,
					database.workspaces,
					database.nodes,
					database.contents,
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
		},
		(error): AppError => importError(`恢复备份失败: ${error}`),
	);

/**
 * 从备份数据恢复（不从文件读取）
 */
export const restoreBackupData = (
	backupData: BackupData,
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
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
					if (backupData.attachments?.length)
						await database.attachments.bulkPut(
							backupData.attachments as never[],
						);
					if (backupData.tags?.length)
						await database.tags.bulkPut(backupData.tags as never[]);
				},
			);
		},
		(error): AppError => importError(`恢复备份数据失败: ${error}`),
	);

// ============================================================================
// 统计操作
// ============================================================================

/**
 * 获取数据库统计信息
 */
export const getDatabaseStats = (): TE.TaskEither<AppError, DatabaseStats> =>
	TE.tryCatch(
		async () => {
			const [
				userCount,
				projectCount,
				nodeCount,
				contentCount,
				attachmentCount,
				tagCount,
			] = await Promise.all([
				database.users.count(),
				database.workspaces.count(),
				database.nodes.count(),
				database.contents.count(),
				database.attachments.count(),
				database.tags.count(),
			]);

			const drawingCount = await database.nodes
				.where("type")
				.equals("drawing")
				.count();

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
		(error): AppError => dbError(`获取数据库统计信息失败: ${error}`),
	);

// ============================================================================
// 本地备份管理
// ============================================================================

const LOCAL_BACKUPS_KEY = "auto-backups";
const LAST_BACKUP_KEY = "last-auto-backup";

/**
 * 获取本地存储的备份列表
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
 */
export const saveLocalBackup = (
	backup: BackupData,
	maxBackups = 3,
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			const backups = getLocalBackups();
			backups.unshift({ timestamp: backup.metadata.timestamp, data: backup });
			const recentBackups = backups.slice(0, maxBackups);
			localStorage.setItem(LOCAL_BACKUPS_KEY, JSON.stringify(recentBackups));
			localStorage.setItem(LAST_BACKUP_KEY, backup.metadata.timestamp);
		},
		(error): AppError => dbError(`保存本地备份失败: ${error}`),
	);

/**
 * 从本地存储恢复备份
 */
export const restoreLocalBackup = (
	timestamp: string,
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			const backups = getLocalBackups();
			const backup = backups.find((b) => b.timestamp === timestamp);

			if (!backup) {
				throw new Error(`未找到备份: ${timestamp}`);
			}

			const result = await restoreBackupData(backup.data)();
			if (result._tag === "Left") {
				throw new Error(result.left.message);
			}
		},
		(error): AppError => importError(`恢复本地备份失败: ${error}`),
	);

/**
 * 获取上次备份时间
 */
export const getLastBackupTime = (): string | null => {
	return localStorage.getItem(LAST_BACKUP_KEY);
};

/**
 * 检查是否需要自动备份
 */
export const shouldAutoBackup = (intervalHours = 24): boolean => {
	const lastBackup = getLastBackupTime();
	if (!lastBackup) return true;

	const lastTime = dayjs(lastBackup);
	const now = dayjs();
	return now.diff(lastTime, "hour") >= intervalHours;
};

/**
 * 执行自动备份
 */
export const performAutoBackup = (
	intervalHours = 24,
): TE.TaskEither<AppError, boolean> => {
	if (!shouldAutoBackup(intervalHours)) {
		return TE.right(false);
	}

	return pipe(
		createBackup(),
		TE.chain((backup) =>
			pipe(
				saveLocalBackup(backup),
				TE.map(() => true),
			),
		),
	);
};

// ============================================================================
// 自动备份管理器
// ============================================================================

export class AutoBackupManager {
	private intervalId: number | null = null;

	start(intervalHours = 24) {
		if (this.intervalId) {
			return;
		}

		this.checkAndBackup();
		this.intervalId = window.setInterval(
			() => this.checkAndBackup(),
			intervalHours * 60 * 60 * 1000,
		);
	}

	stop() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	private async checkAndBackup() {
		await performAutoBackup()();
	}

	getLocalBackups() {
		return getLocalBackups();
	}

	async restoreLocalBackup(timestamp: string) {
		const result = await restoreLocalBackup(timestamp)();
		if (result._tag === "Left") {
			throw new Error(result.left.message);
		}
	}
}

export const autoBackupManager = new AutoBackupManager();
