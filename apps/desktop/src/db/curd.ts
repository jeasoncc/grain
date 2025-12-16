/**
 * @deprecated This file is deprecated. Use the new model-based architecture instead:
 * - Import { database } from "@/db/database" for database access
 * - Import { NodeRepository, ContentRepository, etc. } from "@/db/models" for CRUD operations
 * - Import types from "@/db/models" instead of "@/db/schema"
 * 
 * This file is kept for backward compatibility during migration.
 */

// db.ts - 简化版数据库操作 (DEPRECATED)

import dayjs from "dayjs";
import Dexie, { type Table } from "dexie";
import { v4 as uuidv4 } from "uuid";
import logger from "@/log/index.ts";
import type {
	AttachmentInterface,
	DBVersionInterface,
	DrawingInterface,
	NodeInterface,
	ProjectInterface,
	UserInterface,
} from "./schema.ts";

// ==============================
// 小说编辑器数据库 - Dexie 初始化
// ==============================
export class NovelEditorDB extends Dexie {
	users!: Table<UserInterface, string>;
	projects!: Table<ProjectInterface, string>;
	drawings!: Table<DrawingInterface, string>;
	attachments!: Table<AttachmentInterface, string>;
	dbVersions!: Table<DBVersionInterface, string>;
	nodes!: Table<NodeInterface, string>;

	constructor() {
		super("NovelEditorDB");

		// 保留所有版本历史以支持数据库迁移
		this.version(1).stores({
			users: "id, username, email",
			projects: "id, title, owner",
			chapters: "id, project, order",
			scenes: "id, chapter, order",
			roles: "id, project, name",
			worldEntries: "id, project, category",
			attachments: "id, project, chapter, scene",
			dbVersions: "id, version",
		});

		this.version(2).stores({
			users: "id, username, email",
			projects: "id, title, owner",
			chapters: "id, project, order",
			scenes: "id, project, chapter, order",
			roles: "id, project, name",
			worldEntries: "id, project, category",
			attachments: "id, project, chapter, scene",
			dbVersions: "id, version",
		});

		this.version(3).stores({
			users: "id, username, email",
			projects: "id, title, owner",
			chapters: "id, project, order",
			scenes: "id, project, chapter, order",
			roles: "id, project, name",
			worldEntries: "id, project, category",
			drawings: "id, project, name",
			attachments: "id, project, chapter, scene",
			dbVersions: "id, version",
		});

		this.version(4).stores({
			users: "id, username, email",
			projects: "id, title, owner",
			chapters: "id, project, order",
			scenes: "id, project, chapter, order",
			roles: "id, project, name",
			worldEntries: "id, project, category",
			wikiEntries: "id, project, name",
			drawings: "id, project, name",
			attachments: "id, project, chapter, scene",
			dbVersions: "id, version",
		});

		this.version(5).stores({
			users: "id, username, email",
			projects: "id, title, owner",
			chapters: "id, project, order",
			scenes: "id, project, chapter, order",
			roles: "id, project, name",
			worldEntries: "id, project, category",
			wikiEntries: "id, project, name",
			drawings: "id, project, name",
			attachments: "id, project, chapter, scene",
			dbVersions: "id, version",
			nodes: "id, workspace, parent, type, order",
		});

		// v6: 清理旧表，简化结构
		this.version(6).stores({
			users: "id, username, email",
			projects: "id, title, owner",
			chapters: null, // 删除
			scenes: null, // 删除
			roles: null, // 删除
			worldEntries: null, // 删除
			wikiEntries: "id, project, name",
			drawings: "id, project, name",
			attachments: "id, project",
			dbVersions: "id, version",
			nodes: "id, workspace, parent, type, order",
		});

		this.open()
			.then(() => logger.success("NovelEditorDB initialized"))
			.catch((err) => logger.error("Dexie open error:", err));
	}

	// ==========================
	// 数据库版本
	// ==========================
	async setDBVersion(version: string, notes?: string) {
		const record: DBVersionInterface = {
			id: uuidv4(),
			version,
			updatedAt: dayjs().toISOString(),
			migrationNotes: notes,
		};
		await this.dbVersions.put(record);
		logger.info(`DB version set to ${version}`);
	}

	async getDBVersion() {
		return this.dbVersions.toArray();
	}

	// ==========================
	// 用户表
	// ==========================
	async addUser(user: Partial<UserInterface>) {
		const now = dayjs().toISOString();
		const newUser: UserInterface = {
			id: uuidv4(),
			username: user.username || "anonymous",
			displayName: user.displayName,
			avatar: user.avatar,
			email: user.email,
			lastLogin: now,
			createDate: now,
			plan: user.plan || "free",
			planStartDate: user.planStartDate,
			planExpiresAt: user.planExpiresAt,
			trialExpiresAt: user.trialExpiresAt,
			token: user.token,
			tokenStatus: user.tokenStatus || "unchecked",
			lastTokenCheck: user.lastTokenCheck,
			serverMessage: user.serverMessage,
			features: user.features,
			state: {
				...user.state,
				lastLocation: user.state?.lastLocation || "",
				currentProject: user.state?.currentProject || "",
				currentChapter: user.state?.currentChapter || "",
				currentScene: user.state?.currentScene || "",
				currentTitle: user.state?.currentTitle || "",
				currentTyping: user.state?.currentTyping || "",
				lastCloudSave: user.state?.lastCloudSave || "",
				lastLocalSave: user.state?.lastLocalSave || "",
				isUserLoggedIn: user.state?.isUserLoggedIn ?? false,
			},
			settings: {
				...user.settings,
				theme: user.settings?.theme || "dark",
				language: user.settings?.language || "en",
				autosave: user.settings?.autosave ?? true,
				spellCheck: user.settings?.spellCheck ?? true,
				lastLocation: user.settings?.lastLocation ?? true,
				fontSize: user.settings?.fontSize || "14px",
			},
		};

		await this.users.add(newUser);
		logger.info(`Added user ${newUser.username} (${newUser.id})`);
		return newUser;
	}

	async updateUser(id: string, updates: Partial<UserInterface>) {
		await this.users.update(id, updates);
		logger.info(`Updated user ${id}`);
	}

	async deleteUser(id: string) {
		await this.users.delete(id);
		logger.warn(`Deleted user ${id}`);
	}

	async getUser(id: string) {
		return this.users.get(id);
	}

	async getAllUsers() {
		return this.users.toArray();
	}

	// ==========================
	// 项目/工作空间表
	// ==========================
	async addProject(project: Partial<ProjectInterface>) {
		const now = dayjs().toISOString();
		const newProject: ProjectInterface = {
			id: uuidv4(),
			title: project.title || "New Project",
			author: project.author || "Author",
			description: project.description || "",
			publisher: project.publisher || "",
			language: project.language || "en",
			lastOpen: now,
			createDate: now,
			members: project.members || [],
			owner: project.owner,
		};
		await this.projects.add(newProject);
		logger.info(`Added project ${newProject.title} (${newProject.id})`);
		return newProject;
	}

	async updateProject(id: string, updates: Partial<ProjectInterface>) {
		await this.projects.update(id, updates);
		logger.info(`Updated project ${id}`);
	}

	async deleteProject(id: string) {
		await this.projects.delete(id);
		logger.warn(`Deleted project ${id}`);
	}

	async getProject(id: string) {
		return this.projects.get(id);
	}

	async getAllProjects() {
		return this.projects.toArray();
	}

	// ==========================
	// 绘图表
	// ==========================
	async addDrawing(drawing: Partial<DrawingInterface>) {
		const now = dayjs().toISOString();
		const newDrawing: DrawingInterface = {
			id: uuidv4(),
			project: drawing.project!,
			name: drawing.name || "New Drawing",
			content: drawing.content || JSON.stringify({ elements: [], appState: {}, files: {} }),
			width: drawing.width || 800,
			height: drawing.height || 600,
			createDate: now,
			updatedAt: now,
		};
		await this.drawings.add(newDrawing);
		logger.info(`Added drawing ${newDrawing.name} (${newDrawing.id})`);
		return newDrawing;
	}

	async updateDrawing(id: string, updates: Partial<DrawingInterface>) {
		updates.updatedAt = dayjs().toISOString();
		await this.drawings.update(id, updates);
		logger.info(`Updated drawing ${id}`);
	}

	async deleteDrawing(id: string) {
		await this.drawings.delete(id);
		logger.warn(`Deleted drawing ${id}`);
	}

	async getDrawing(id: string) {
		return this.drawings.get(id);
	}

	async getDrawingsByProject(projectId: string) {
		return this.drawings.where("project").equals(projectId).toArray();
	}

	// ==========================
	// 附件表
	// ==========================
	async addAttachment(attachment: Partial<AttachmentInterface>) {
		const newAttachment: AttachmentInterface = {
			id: uuidv4(),
			project: attachment.project,
			type: attachment.type || "file",
			fileName: attachment.fileName || "unknown",
			filePath: attachment.filePath || "",
			uploadedAt: dayjs().toISOString(),
			size: attachment.size,
			mimeType: attachment.mimeType,
		};
		await this.attachments.add(newAttachment);
		logger.info(`Added attachment ${newAttachment.fileName} (${newAttachment.id})`);
		return newAttachment;
	}

	async updateAttachment(id: string, updates: Partial<AttachmentInterface>) {
		await this.attachments.update(id, updates);
		logger.info(`Updated attachment ${id}`);
	}

	async deleteAttachment(id: string) {
		await this.attachments.delete(id);
		logger.warn(`Deleted attachment ${id}`);
	}

	async getAttachment(id: string) {
		return this.attachments.get(id);
	}

	async getAttachmentsByProject(projectId: string) {
		return this.attachments.where("project").equals(projectId).toArray();
	}

	// ==========================
	// 节点表 (文件树结构)
	// ==========================
	async addNode(node: Partial<NodeInterface>) {
		const now = dayjs().toISOString();
		
		// 计算同级节点的下一个 order 值
		let nextOrder = 0;
		const siblings = await this.nodes
			.where("workspace")
			.equals(node.workspace!)
			.and((n) => n.parent === (node.parent ?? null))
			.toArray();
		if (siblings.length > 0) {
			nextOrder = Math.max(...siblings.map((s) => s.order)) + 1;
		}

		const newNode: NodeInterface = {
			id: uuidv4(),
			workspace: node.workspace!,
			parent: node.parent ?? null,
			type: node.type || "file",
			title: node.title || "New Node",
			order: node.order ?? nextOrder,
			content: node.content,
			collapsed: node.collapsed ?? true,
			createDate: now,
			lastEdit: now,
		};
		await this.nodes.add(newNode);
		logger.info(`Added node ${newNode.title} (${newNode.id})`);
		return newNode;
	}

	async updateNode(id: string, updates: Partial<NodeInterface>) {
		updates.lastEdit = dayjs().toISOString();
		await this.nodes.update(id, updates);
		logger.info(`Updated node ${id}`);
	}

	async deleteNode(id: string) {
		// 递归删除所有子节点
		const children = await this.nodes.where("parent").equals(id).toArray();
		for (const child of children) {
			await this.deleteNode(child.id);
		}
		// 删除当前节点
		await this.nodes.delete(id);
		logger.warn(`Deleted node ${id}`);
	}

	async getNode(id: string) {
		return this.nodes.get(id);
	}

	async getNodesByWorkspace(workspaceId: string) {
		return this.nodes.where("workspace").equals(workspaceId).toArray();
	}

	async getNodesByParent(parentId: string | null) {
		if (parentId === null) {
			return this.nodes.filter((n) => n.parent === null).toArray();
		}
		return this.nodes.where("parent").equals(parentId).toArray();
	}

	async getNodesByWorkspaceAndParent(workspaceId: string, parentId: string | null) {
		const nodes = await this.getNodesByWorkspace(workspaceId);
		return nodes.filter((n) => n.parent === parentId).sort((a, b) => a.order - b.order);
	}
}

// ==============================
// 初始化数据库
// ==============================
export async function initDatabase() {
	try {
		const existingUsers = await db.users.toArray();
		if (existingUsers.length === 0) {
			await db.addUser({
				username: "guest",
				displayName: "Guest User",
				plan: "free",
			});
			logger.info("✅ Created default guest user");
		}

		const dbVersion = await db.getDBVersion();
		if (dbVersion.length === 0) {
			await db.setDBVersion("2.0.0", "Simplified database structure");
			logger.info("✅ Initialized DB version 2.0.0");
		}

		logger.success("🎉 Database initialized successfully!");
	} catch (error) {
		logger.error("❌ Database initialization failed:", error);
	}
}

// ==============================
// 单例导出
// ==============================
export const db = new NovelEditorDB();
