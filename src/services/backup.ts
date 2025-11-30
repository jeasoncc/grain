/**
 * 备份与恢复服务
 * 提供完整的数据库备份、恢复、自动备份功能
 */
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { db } from "@/db/curd";
import dayjs from "dayjs";
import logger from "@/log/index";

export interface BackupMetadata {
	version: string;
	timestamp: string;
	projectCount: number;
	chapterCount: number;
	sceneCount: number;
	appVersion: string;
}

export interface BackupData {
	metadata: BackupMetadata;
	users: any[];
	projects: any[];
	chapters: any[];
	scenes: any[];
	roles: any[];
	worldEntries: any[];
	attachments: any[];
	dbVersions: any[];
}

/**
 * 创建完整数据库备份
 */
export async function createBackup(): Promise<BackupData> {
	logger.info("开始创建备份...");

	const [users, projects, chapters, scenes, roles, worldEntries, attachments, dbVersions] =
		await Promise.all([
			db.users.toArray(),
			db.projects.toArray(),
			db.chapters.toArray(),
			db.scenes.toArray(),
			db.roles.toArray(),
			db.worldEntries.toArray(),
			db.attachments.toArray(),
			db.dbVersions.toArray(),
		]);

	const backup: BackupData = {
		metadata: {
			version: "1.0.0",
			timestamp: dayjs().toISOString(),
			projectCount: projects.length,
			chapterCount: chapters.length,
			sceneCount: scenes.length,
			appVersion: "0.1.0", // 从 package.json 读取
		},
		users,
		projects,
		chapters,
		scenes,
		roles,
		worldEntries,
		attachments,
		dbVersions,
	};

	logger.success(`备份创建成功: ${projects.length} 个项目, ${scenes.length} 个场景`);
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
 * 导出备份为压缩包（包含附件）
 */
export async function exportBackupZip(): Promise<void> {
	const backup = await createBackup();
	const zip = new JSZip();

	// 添加主数据文件
	zip.file("backup.json", JSON.stringify(backup, null, 2));

	// 添加元数据文件
	zip.file(
		"README.txt",
		`Novel Editor 备份文件
创建时间: ${backup.metadata.timestamp}
项目数量: ${backup.metadata.projectCount}
章节数量: ${backup.metadata.chapterCount}
场景数量: ${backup.metadata.sceneCount}
应用版本: ${backup.metadata.appVersion}

恢复方法:
1. 打开 Novel Editor
2. 进入设置 -> 数据管理
3. 选择"恢复备份"
4. 选择此文件
`
	);

	// 生成压缩包
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

		// 判断文件类型
		if (file.name.endsWith(".zip")) {
			// 解压 ZIP 文件
			const zip = await JSZip.loadAsync(file);
			const backupFile = zip.file("backup.json");
			if (!backupFile) {
				throw new Error("备份文件格式错误：找不到 backup.json");
			}
			const content = await backupFile.async("string");
			backupData = JSON.parse(content);
		} else {
			// 直接读取 JSON
			const content = await file.text();
			backupData = JSON.parse(content);
		}

		// 验证备份数据
		if (!backupData.metadata || !backupData.projects) {
			throw new Error("备份文件格式错误");
		}

		// 清空现有数据（可选，根据需求决定是否清空）
		// await clearAllData();

		// 恢复数据
		await db.transaction("rw", [
			db.users,
			db.projects,
			db.chapters,
			db.scenes,
			db.roles,
			db.worldEntries,
			db.attachments,
			db.dbVersions,
		], async () => {
			// 批量插入数据
			if (backupData.users?.length) await db.users.bulkPut(backupData.users);
			if (backupData.projects?.length) await db.projects.bulkPut(backupData.projects);
			if (backupData.chapters?.length) await db.chapters.bulkPut(backupData.chapters);
			if (backupData.scenes?.length) await db.scenes.bulkPut(backupData.scenes);
			if (backupData.roles?.length) await db.roles.bulkPut(backupData.roles);
			if (backupData.worldEntries?.length) await db.worldEntries.bulkPut(backupData.worldEntries);
			if (backupData.attachments?.length) await db.attachments.bulkPut(backupData.attachments);
			if (backupData.dbVersions?.length) await db.dbVersions.bulkPut(backupData.dbVersions);
		});

		logger.success(
			`备份恢复成功: ${backupData.metadata.projectCount} 个项目, ${backupData.metadata.sceneCount} 个场景`
		);
	} catch (error) {
		logger.error("备份恢复失败:", error);
		throw error;
	}
}

/**
 * 清空所有数据（危险操作）
 */
export async function clearAllData(): Promise<void> {
	logger.warn("清空所有数据...");
	await db.transaction("rw", [
		db.users,
		db.projects,
		db.chapters,
		db.scenes,
		db.roles,
		db.worldEntries,
		db.attachments,
	], async () => {
		await db.users.clear();
		await db.projects.clear();
		await db.chapters.clear();
		await db.scenes.clear();
		await db.roles.clear();
		await db.worldEntries.clear();
		await db.attachments.clear();
	});
	logger.success("数据已清空");
}

/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats() {
	const [
		userCount,
		projectCount,
		chapterCount,
		sceneCount,
		roleCount,
		worldEntryCount,
		attachmentCount,
	] = await Promise.all([
		db.users.count(),
		db.projects.count(),
		db.chapters.count(),
		db.scenes.count(),
		db.roles.count(),
		db.worldEntries.count(),
		db.attachments.count(),
	]);

	// 计算总字数
	const scenes = await db.scenes.toArray();
	let totalWords = 0;
	for (const scene of scenes) {
		try {
			const content = typeof scene.content === "string" ? JSON.parse(scene.content) : scene.content;
			const text = extractTextFromContent(content);
			totalWords += countWords(text);
		} catch {
			// 忽略解析错误
		}
	}

	return {
		userCount,
		projectCount,
		chapterCount,
		sceneCount,
		roleCount,
		worldEntryCount,
		attachmentCount,
		totalWords,
	};
}

// 辅助函数：从内容中提取文本
function extractTextFromContent(content: any): string {
	if (!content || !content.root) return "";
	const children = content.root.children || [];
	return children
		.map((node: any) => {
			if (node.type === "paragraph" || node.type === "heading") {
				return node.children?.map((child: any) => child.text || "").join("") || "";
			}
			return "";
		})
		.join("\n");
}

// 辅助函数：统计字数
function countWords(text: string): number {
	// 中文字符
	const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
	// 英文单词
	const englishWords = text.match(/[a-zA-Z]+/g) || [];
	return chineseChars.length + englishWords.length;
}

/**
 * 自动备份管理器
 */
export class AutoBackupManager {
	private intervalId: number | null = null;
	private lastBackupTime: string | null = null;

	/**
	 * 启动自动备份（每天一次）
	 */
	start(intervalHours = 24) {
		if (this.intervalId) {
			logger.warn("自动备份已在运行");
			return;
		}

		// 立即检查是否需要备份
		this.checkAndBackup();

		// 设置定时器
		this.intervalId = window.setInterval(
			() => this.checkAndBackup(),
			intervalHours * 60 * 60 * 1000
		);

		logger.info(`自动备份已启动，间隔: ${intervalHours} 小时`);
	}

	/**
	 * 停止自动备份
	 */
	stop() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
			logger.info("自动备份已停止");
		}
	}

	/**
	 * 检查并执行备份
	 */
	private async checkAndBackup() {
		try {
			// 检查上次备份时间
			const lastBackup = localStorage.getItem("last-auto-backup");
			if (lastBackup) {
				const lastTime = dayjs(lastBackup);
				const now = dayjs();
				if (now.diff(lastTime, "hour") < 24) {
					logger.info("距离上次备份不足24小时，跳过");
					return;
				}
			}

			// 创建备份
			const backup = await createBackup();

			// 保存到 localStorage（仅保存最近3次）
			const backups = this.getLocalBackups();
			backups.unshift({
				timestamp: backup.metadata.timestamp,
				data: backup,
			});

			// 只保留最近3次
			const recentBackups = backups.slice(0, 3);
			localStorage.setItem("auto-backups", JSON.stringify(recentBackups));
			localStorage.setItem("last-auto-backup", backup.metadata.timestamp);

			this.lastBackupTime = backup.metadata.timestamp;
			logger.success(`自动备份完成: ${backup.metadata.timestamp}`);
		} catch (error) {
			logger.error("自动备份失败:", error);
		}
	}

	/**
	 * 获取本地备份列表
	 */
	getLocalBackups(): Array<{ timestamp: string; data: BackupData }> {
		try {
			const stored = localStorage.getItem("auto-backups");
			return stored ? JSON.parse(stored) : [];
		} catch {
			return [];
		}
	}

	/**
	 * 恢复本地备份
	 */
	async restoreLocalBackup(timestamp: string) {
		const backups = this.getLocalBackups();
		const backup = backups.find((b) => b.timestamp === timestamp);
		if (!backup) {
			throw new Error("备份不存在");
		}

		// 恢复数据
		await db.transaction("rw", [
			db.users,
			db.projects,
			db.chapters,
			db.scenes,
			db.roles,
			db.worldEntries,
			db.attachments,
		], async () => {
			if (backup.data.users?.length) await db.users.bulkPut(backup.data.users);
			if (backup.data.projects?.length) await db.projects.bulkPut(backup.data.projects);
			if (backup.data.chapters?.length) await db.chapters.bulkPut(backup.data.chapters);
			if (backup.data.scenes?.length) await db.scenes.bulkPut(backup.data.scenes);
			if (backup.data.roles?.length) await db.roles.bulkPut(backup.data.roles);
			if (backup.data.worldEntries?.length) await db.worldEntries.bulkPut(backup.data.worldEntries);
			if (backup.data.attachments?.length) await db.attachments.bulkPut(backup.data.attachments);
		});

		logger.success(`已恢复备份: ${timestamp}`);
	}
}

// 导出单例
export const autoBackupManager = new AutoBackupManager();
