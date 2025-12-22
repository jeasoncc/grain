/**
 * Backup & Restore Service
 * Provides complete database backup and restore functionality
 *
 * Database tables:
 * - users: User information
 * - workspaces: Project/workspace metadata
 * - nodes: File tree structure (with tags array)
 * - contents: Document content (Lexical JSON, Excalidraw, etc.)
 * - drawings: Excalidraw drawings
 * - attachments: File attachments
 * - tags: Tag aggregation cache
 * - dbVersions: Database version tracking
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
	tagCount: number;
	appVersion: string;
}

export interface BackupData {
	metadata: BackupMetadata;
	users: unknown[];
	workspaces: unknown[];
	nodes: unknown[];
	contents: unknown[];
	drawings: unknown[];
	attachments: unknown[];
	tags: unknown[];
	dbVersions: unknown[];
	/** @deprecated Use workspaces instead */
	projects?: unknown[];
	/** @deprecated Wiki entries are now stored as file nodes with "wiki" tag */
	wikiEntries?: unknown[];
}

/**
 * Create complete database backup
 */
export async function createBackup(): Promise<BackupData> {
	logger.info("Creating backup...");

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
		`Backup created: ${workspaces.length} workspaces, ${nodes.length} nodes, ${contents.length} contents`,
	);
	return backup;
}

/**
 * Export backup to JSON file
 */
export async function exportBackup(): Promise<void> {
	const backup = await createBackup();
	const json = JSON.stringify(backup, null, 2);
	const blob = new Blob([json], { type: "application/json" });
	const filename = `grain-backup-${dayjs().format("YYYY-MM-DD-HHmmss")}.json`;
	saveAs(blob, filename);
	logger.success(`Backup exported: ${filename}`);
}

/**
 * Export backup as ZIP archive
 */
export async function exportBackupZip(): Promise<void> {
	const backup = await createBackup();
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
	logger.success(`Compressed backup exported: ${filename}`);
}

/**
 * Restore backup from file
 */
export async function restoreBackup(file: File): Promise<void> {
	logger.info("Restoring backup...");

	try {
		let backupData: BackupData;

		if (file.name.endsWith(".zip")) {
			const zip = await JSZip.loadAsync(file);
			const backupFile = zip.file("backup.json");
			if (!backupFile) {
				throw new Error("Invalid backup file: backup.json not found");
			}
			const content = await backupFile.async("string");
			backupData = JSON.parse(content);
		} else {
			const content = await file.text();
			backupData = JSON.parse(content);
		}

		if (!backupData.metadata) {
			throw new Error("Invalid backup file format");
		}

		// Handle legacy backup format (projects -> workspaces)
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
					await database.attachments.bulkPut(backupData.attachments as never[]);
				if (backupData.tags?.length)
					await database.tags.bulkPut(backupData.tags as never[]);
				if (backupData.dbVersions?.length)
					await database.dbVersions.bulkPut(backupData.dbVersions as never[]);
			},
		);

		logger.success(`Backup restored: ${workspacesData.length} workspaces`);
	} catch (error) {
		logger.error("Backup restore failed:", error);
		throw error;
	}
}

/**
 * Clear all data
 */
export async function clearAllData(): Promise<void> {
	logger.warn("Clearing all data...");
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
			await database.users.clear();
			await database.workspaces.clear();
			await database.nodes.clear();
			await database.contents.clear();
			await database.drawings.clear();
			await database.attachments.clear();
			await database.tags.clear();
		},
	);
	logger.success("All data cleared");
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
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
}

/**
 * Auto Backup Manager
 */
export class AutoBackupManager {
	private intervalId: number | null = null;

	start(intervalHours = 24) {
		if (this.intervalId) {
			logger.warn("Auto backup already running");
			return;
		}

		this.checkAndBackup();
		this.intervalId = window.setInterval(
			() => this.checkAndBackup(),
			intervalHours * 60 * 60 * 1000,
		);

		logger.info(`Auto backup started, interval: ${intervalHours} hours`);
	}

	stop() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
			logger.info("Auto backup stopped");
		}
	}

	private async checkAndBackup() {
		try {
			const lastBackup = localStorage.getItem("last-auto-backup");
			if (lastBackup) {
				const lastTime = dayjs(lastBackup);
				const now = dayjs();
				if (now.diff(lastTime, "hour") < 24) {
					logger.info("Less than 24 hours since last backup, skipping");
					return;
				}
			}

			const backup = await createBackup();
			const backups = this.getLocalBackups();
			backups.unshift({ timestamp: backup.metadata.timestamp, data: backup });

			const recentBackups = backups.slice(0, 3);
			localStorage.setItem("auto-backups", JSON.stringify(recentBackups));
			localStorage.setItem("last-auto-backup", backup.metadata.timestamp);

			logger.success(`Auto backup completed: ${backup.metadata.timestamp}`);
		} catch (error) {
			logger.error("Auto backup failed:", error);
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
			throw new Error("Backup not found");
		}

		const workspacesData = backup.data.workspaces || backup.data.projects || [];

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
				if (backup.data.users?.length)
					await database.users.bulkPut(backup.data.users as never[]);
				if (workspacesData.length)
					await database.workspaces.bulkPut(workspacesData as never[]);
				if (backup.data.nodes?.length)
					await database.nodes.bulkPut(backup.data.nodes as never[]);
				if (backup.data.contents?.length)
					await database.contents.bulkPut(backup.data.contents as never[]);
				if (backup.data.drawings?.length)
					await database.drawings.bulkPut(backup.data.drawings as never[]);
				if (backup.data.attachments?.length)
					await database.attachments.bulkPut(
						backup.data.attachments as never[],
					);
				if (backup.data.tags?.length)
					await database.tags.bulkPut(backup.data.tags as never[]);
			},
		);

		logger.success(`Backup restored: ${timestamp}`);
	}
}

export const autoBackupManager = new AutoBackupManager();
