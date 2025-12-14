/**
 * 备份与恢复服务 - 简化版
 * 提供完整的数据库备份、恢复功能
 */

import dayjs from "dayjs";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { db } from "@/db/curd";
import logger from "@/log/index";

export interface BackupMetadata {
	version: string;
	timestamp: string;
	projectCount: number;
	nodeCount: number;
	appVersion: string;
}

export interface BackupData {
	metadata: BackupMetadata;
	users: any[];
	projects: any[];
	wikiEntries: any[];
	drawings: any[];
	attachments: any[];
	nodes: any[];
	dbVersions: any[];
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
		dbVersions,
	] = await Promise.all([
		db.users.toArray(),
		db.projects.toArray(),
		db.wikiEntries.toArray(),
		db.drawings.toArray(),
		db.attachments.toArray(),
		db.nodes.toArray(),
		db.dbVersions.toArray(),
	]);

	const backup: BackupData = {
		metadata: {
			version: "2.0.0",
			timestamp: dayjs().toISOString(),
			projectCount: projects.length,
			nodeCount: nodes.length,
			appVersion: "0.1.0",
		},
		users,
		projects,
		wikiEntries,
		drawings,
		attachments,
		nodes,
		dbVersions,
	};

	logger.success(`备份创建成功: ${projects.length} 个项目, ${nodes.length} 个节点`);
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

		await db.transaction(
			"rw",
			[
				db.users,
				db.projects,
				db.wikiEntries,
				db.drawings,
				db.attachments,
				db.nodes,
				db.dbVersions,
			],
			async () => {
				if (backupData.users?.length) await db.users.bulkPut(backupData.users);
				if (backupData.projects?.length) await db.projects.bulkPut(backupData.projects);
				if (backupData.wikiEntries?.length) await db.wikiEntries.bulkPut(backupData.wikiEntries);
				if (backupData.drawings?.length) await db.drawings.bulkPut(backupData.drawings);
				if (backupData.attachments?.length) await db.attachments.bulkPut(backupData.attachments);
				if (backupData.nodes?.length) await db.nodes.bulkPut(backupData.nodes);
				if (backupData.dbVersions?.length) await db.dbVersions.bulkPut(backupData.dbVersions);
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
	await db.transaction(
		"rw",
		[db.users, db.projects, db.wikiEntries, db.drawings, db.attachments, db.nodes],
		async () => {
			await db.users.clear();
			await db.projects.clear();
			await db.wikiEntries.clear();
			await db.drawings.clear();
			await db.attachments.clear();
			await db.nodes.clear();
		},
	);
	logger.success("数据已清空");
}

/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats() {
	const [userCount, projectCount, wikiEntryCount, drawingCount, attachmentCount, nodeCount] =
		await Promise.all([
			db.users.count(),
			db.projects.count(),
			db.wikiEntries.count(),
			db.drawings.count(),
			db.attachments.count(),
			db.nodes.count(),
		]);

	return {
		userCount,
		projectCount,
		wikiEntryCount,
		drawingCount,
		attachmentCount,
		nodeCount,
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

		await db.transaction(
			"rw",
			[db.users, db.projects, db.wikiEntries, db.drawings, db.attachments, db.nodes],
			async () => {
				if (backup.data.users?.length) await db.users.bulkPut(backup.data.users);
				if (backup.data.projects?.length) await db.projects.bulkPut(backup.data.projects);
				if (backup.data.wikiEntries?.length) await db.wikiEntries.bulkPut(backup.data.wikiEntries);
				if (backup.data.drawings?.length) await db.drawings.bulkPut(backup.data.drawings);
				if (backup.data.attachments?.length) await db.attachments.bulkPut(backup.data.attachments);
				if (backup.data.nodes?.length) await db.nodes.bulkPut(backup.data.nodes);
			},
		);

		logger.success(`已恢复备份: ${timestamp}`);
	}
}

export const autoBackupManager = new AutoBackupManager();
