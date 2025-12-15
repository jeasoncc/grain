/**
 * 备份与恢复服务 - 简化版
 * 提供完整的数据库备份、恢复功能
 * 包含 contents 表以支持新的数据架构
 *
 * Requirements: 6.2
 */

import dayjs from "dayjs";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { database } from "@/db/database";
import logger from "@/log/index";

export interface BackupMetadata {
	version: string;
	timestamp: string;
	projectCount: number;
	nodeCount: number;
	contentCount: number;
	appVersion: string;
}

export interface BackupData {
	metadata: BackupMetadata;
	users: unknown[];
	projects: unknown[];
	wikiEntries: unknown[];
	drawings: unknown[];
	attachments: unknown[];
	nodes: unknown[];
	contents: unknown[];
	dbVersions: unknown[];
}

/**
 * 创建完整数据库备份
 */
export async function createBackup(): Promise<BackupData> {
	logger.info("开始创建备份...");

	const [
		users,
		projects,
		wikiEntries,
		drawings,
		attachments,
		nodes,
		contents,
		dbVersions,
	] = await Promise.all([
		database.users.toArray(),
		database.workspaces.toArray(),
		database.wikiEntries.toArray(),
		database.drawings.toArray(),
		database.attachments.toArray(),
		database.nodes.toArray(),
		database.contents.toArray(),
		database.dbVersions.toArray(),
	]);

	const backup: BackupData = {
		metadata: {
			version: "3.0.0",
			timestamp: dayjs().toISOString(),
			projectCount: projects.length,
			nodeCount: nodes.length,
			contentCount: contents.length,
			appVersion: "0.1.0",
		},
		users,
		projects,
		wikiEntries,
		drawings,
		attachments,
		nodes,
		contents,
		dbVersions,
	};

	logger.success(`备份创建成功: ${projects.length} 个项目, ${nodes.length} 个节点, ${contents.length} 个内容记录`);
	return backup;
}

/**
 * 导出备份到文件
 */
export async function exportBackup(): Promise<void> {
	const backup = await createBackup();
	const json = JSON.stringify(backup, null, 2);
	const blob = new Blob([json], { type: "application/json" });
	const filename = `novel-editor-backup-${dayjs().format("YYYY-MM-DD-HHmmss")}.json`;
	saveAs(blob, filename);
	logger.success(`备份已导出: ${filename}`);
}

/**
 * 导出备份为压缩包
 */
export async function exportBackupZip(): Promise<void> {
	const backup = await createBackup();
	const zip = new JSZip();

	zip.file("backup.json", JSON.stringify(backup, null, 2));
	zip.file(
		"README.txt",
		`Novel Editor 备份文件
创建时间: ${backup.metadata.timestamp}
项目数量: ${backup.metadata.projectCount}
节点数量: ${backup.metadata.nodeCount}
内容记录: ${backup.metadata.contentCount}
应用版本: ${backup.metadata.appVersion}

恢复方法:
1. 打开 Novel Editor
2. 进入设置 -> 数据管理
3. 选择"恢复备份"
4. 选择此文件
`,
	);

	const blob = await zip.generateAsync({
		type: "blob",
		compression: "DEFLATE",
		compressionOptions: { level: 9 },
	});

	const filename = `novel-editor-backup-${dayjs().format("YYYY-MM-DD-HHmmss")}.zip`;
	saveAs(blob, filename);
	logger.success(`压缩备份已导出: ${filename}`);
}

/**
 * 从文件恢复备份
 */
export async function restoreBackup(file: File): Promise<void> {
	logger.info("开始恢复备份...");

	try {
		let backupData: BackupData;

		if (file.name.endsWith(".zip")) {
			const zip = await JSZip.loadAsync(file);
			const backupFile = zip.file("backup.json");
			if (!backupFile) {
				throw new Error("备份文件格式错误：找不到 backup.json");
			}
			const content = await backupFile.async("string");
			backupData = JSON.parse(content);
		} else {
			const content = await file.text();
			backupData = JSON.parse(content);
		}

		if (!backupData.metadata || !backupData.projects) {
			throw new Error("备份文件格式错误");
		}

		await database.transaction(
			"rw",
			[
				database.users,
				database.workspaces,
				database.wikiEntries,
				database.drawings,
				database.attachments,
				database.nodes,
				database.contents,
				database.dbVersions,
			],
			async () => {
				if (backupData.users?.length) await database.users.bulkPut(backupData.users as never[]);
				if (backupData.projects?.length) await database.workspaces.bulkPut(backupData.projects as never[]);
				if (backupData.wikiEntries?.length) await database.wikiEntries.bulkPut(backupData.wikiEntries as never[]);
				if (backupData.drawings?.length) await database.drawings.bulkPut(backupData.drawings as never[]);
				if (backupData.attachments?.length) await database.attachments.bulkPut(backupData.attachments as never[]);
				if (backupData.nodes?.length) await database.nodes.bulkPut(backupData.nodes as never[]);
				if (backupData.contents?.length) await database.contents.bulkPut(backupData.contents as never[]);
				if (backupData.dbVersions?.length) await database.dbVersions.bulkPut(backupData.dbVersions as never[]);
			},
		);

		logger.success(`备份恢复成功: ${backupData.metadata.projectCount} 个项目`);
	} catch (error) {
		logger.error("备份恢复失败:", error);
		throw error;
	}
}

/**
 * 清空所有数据
 */
export async function clearAllData(): Promise<void> {
	logger.warn("清空所有数据...");
	await database.transaction(
		"rw",
		[database.users, database.workspaces, database.wikiEntries, database.drawings, database.attachments, database.nodes, database.contents],
		async () => {
			await database.users.clear();
			await database.workspaces.clear();
			await database.wikiEntries.clear();
			await database.drawings.clear();
			await database.attachments.clear();
			await database.nodes.clear();
			await database.contents.clear();
		},
	);
	logger.success("数据已清空");
}

/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats() {
	const [userCount, projectCount, wikiEntryCount, drawingCount, attachmentCount, nodeCount, contentCount] =
		await Promise.all([
			database.users.count(),
			database.workspaces.count(),
			database.wikiEntries.count(),
			database.drawings.count(),
			database.attachments.count(),
			database.nodes.count(),
			database.contents.count(),
		]);

	return {
		userCount,
		projectCount,
		wikiEntryCount,
		drawingCount,
		attachmentCount,
		nodeCount,
		contentCount,
	};
}

/**
 * 自动备份管理器
 */
export class AutoBackupManager {
	private intervalId: number | null = null;

	start(intervalHours = 24) {
		if (this.intervalId) {
			logger.warn("自动备份已在运行");
			return;
		}

		this.checkAndBackup();
		this.intervalId = window.setInterval(
			() => this.checkAndBackup(),
			intervalHours * 60 * 60 * 1000,
		);

		logger.info(`自动备份已启动，间隔: ${intervalHours} 小时`);
	}

	stop() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
			logger.info("自动备份已停止");
		}
	}

	private async checkAndBackup() {
		try {
			const lastBackup = localStorage.getItem("last-auto-backup");
			if (lastBackup) {
				const lastTime = dayjs(lastBackup);
				const now = dayjs();
				if (now.diff(lastTime, "hour") < 24) {
					logger.info("距离上次备份不足24小时，跳过");
					return;
				}
			}

			const backup = await createBackup();
			const backups = this.getLocalBackups();
			backups.unshift({ timestamp: backup.metadata.timestamp, data: backup });

			const recentBackups = backups.slice(0, 3);
			localStorage.setItem("auto-backups", JSON.stringify(recentBackups));
			localStorage.setItem("last-auto-backup", backup.metadata.timestamp);

			logger.success(`自动备份完成: ${backup.metadata.timestamp}`);
		} catch (error) {
			logger.error("自动备份失败:", error);
		}
	}

	getLocalBackups(): Array<{ timestamp: string; data: BackupData }> {
		try {
			const stored = localStorage.getItem("auto-backups");
			return stored ? JSON.parse(stored) : [];
		} catch {
			return [];
		}
	}

	async restoreLocalBackup(timestamp: string) {
		const backups = this.getLocalBackups();
		const backup = backups.find((b) => b.timestamp === timestamp);
		if (!backup) {
			throw new Error("备份不存在");
		}

		await database.transaction(
			"rw",
			[database.users, database.workspaces, database.wikiEntries, database.drawings, database.attachments, database.nodes, database.contents],
			async () => {
				if (backup.data.users?.length) await database.users.bulkPut(backup.data.users as never[]);
				if (backup.data.projects?.length) await database.workspaces.bulkPut(backup.data.projects as never[]);
				if (backup.data.wikiEntries?.length) await database.wikiEntries.bulkPut(backup.data.wikiEntries as never[]);
				if (backup.data.drawings?.length) await database.drawings.bulkPut(backup.data.drawings as never[]);
				if (backup.data.attachments?.length) await database.attachments.bulkPut(backup.data.attachments as never[]);
				if (backup.data.nodes?.length) await database.nodes.bulkPut(backup.data.nodes as never[]);
				if (backup.data.contents?.length) await database.contents.bulkPut(backup.data.contents as never[]);
			},
		);

		logger.success(`已恢复备份: ${timestamp}`);
	}
}

export const autoBackupManager = new AutoBackupManager();
