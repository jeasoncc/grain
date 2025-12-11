// db.ts

import dayjs from "dayjs";
import Dexie, { type Table } from "dexie";
import { v4 as uuidv4 } from "uuid";
import logger from "@/log/index.ts";
import type {
	AttachmentInterface,
	ChapterInterface,
	DBVersionInterface,
	DrawingInterface,
	ProjectInterface,
	RoleInterface,
	SceneInterface,
	UserInterface,
	WorldEntryInterface,
	WikiEntryInterface,
} from "./schema.ts";

// ==============================
// 小说编辑器数据库 - Dexie 初始化
// ==============================
export class NovelEditorDB extends Dexie {
	users!: Table<UserInterface, string>;
	projects!: Table<ProjectInterface, string>;
	chapters!: Table<ChapterInterface, string>;
	scenes!: Table<SceneInterface, string>;
	roles!: Table<RoleInterface, string>; // 保留用于迁移
	worldEntries!: Table<WorldEntryInterface, string>; // 保留用于迁移
	wikiEntries!: Table<WikiEntryInterface, string>; // 新的Wiki系统
	drawings!: Table<DrawingInterface, string>;
	attachments!: Table<AttachmentInterface, string>;
	dbVersions!: Table<DBVersionInterface, string>;

	constructor() {
		super("NovelEditorDB");

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

		// v2: Add 'project' index for scenes to enable where('project') queries
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

		// v3: Add drawings table for book-level drawing storage
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

		// v4: Add Wiki system (upgrade from roles system)
		this.version(4).stores({
			users: "id, username, email",
			projects: "id, title, owner",
			chapters: "id, project, order",
			scenes: "id, project, chapter, order",
			roles: "id, project, name", // 保留用于迁移
			worldEntries: "id, project, category", // 保留用于迁移
			wikiEntries: "id, project, name", // 新的Wiki系统
			drawings: "id, project, name",
			attachments: "id, project, chapter, scene",
			dbVersions: "id, version",
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
				theme: user.settings?.theme || "light",
				language: user.settings?.language || "en", // 默认英文
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
	// 项目表
	// ==========================
	async addProject(project: Partial<ProjectInterface>) {
		const now = dayjs().toISOString();
		const newProject: ProjectInterface = {
			id: uuidv4(),
			title: project.title || "New Project",
			author: project.author || "Author",
			description: project.description || "",
			publisher: project.publisher || "",
			language: project.language || "en", // 默认英文
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
	// 章节表
	// ==========================
	async addChapter(chapter: Partial<ChapterInterface>) {
		const newChapter: ChapterInterface = {
			id: uuidv4(),
			project: chapter.project!,
			title: chapter.title || "New Chapter",
			order: chapter.order || 0,
			open: chapter.open || false,
			showEdit: chapter.showEdit || false,
		};
		await this.chapters.add(newChapter);
		logger.info(`Added chapter ${newChapter.title} (${newChapter.id})`);
		return newChapter;
	}

	async updateChapter(id: string, updates: Partial<ChapterInterface>) {
		await this.chapters.update(id, updates);
		logger.info(`Updated chapter ${id}`);
	}

	async deleteChapter(id: string) {
		await this.chapters.delete(id);
		logger.warn(`Deleted chapter ${id}`);
	}

	async getChapter(id: string) {
		return this.chapters.get(id);
	}

	async getChaptersByProject(projectId: string) {
		return this.chapters.where("project").equals(projectId).sortBy("order");
	}
	async getAllChapters() {
		return this.chapters.toArray();
	}

	// ==========================
	// 场景表
	// ==========================
	async addScene(scene: Partial<SceneInterface>) {
		const now = dayjs().toISOString();
		const newScene: SceneInterface = {
			id: uuidv4(),
			chapter: scene.chapter!,
			project: scene.project!,
			title: scene.title || "New Scene",
			order: scene.order || 0,
			lastEdit: now,
			content: scene.content || "",
			createDate: now,
			showEdit: scene.showEdit || false,
			type: scene.type || "text",
			filePath: scene.filePath,
		};
		await this.scenes.add(newScene);
		logger.info(`Added scene ${newScene.title} (${newScene.id})`);
		return newScene;
	}

	async updateScene(id: string, updates: Partial<SceneInterface>) {
		updates.lastEdit = dayjs().toISOString();
		await this.scenes.update(id, updates);
		logger.info(`Updated scene ${id}`);
	}

	async deleteScene(id: string) {
		await this.scenes.delete(id);
		logger.warn(`Deleted scene ${id}`);
	}

	async getScene(id: string) {
		return this.scenes.get(id);
	}

	async getScenesByChapter(chapterId: string) {
		return this.scenes.where("chapter").equals(chapterId).sortBy("order");
	}
	async getScenesByProject(projectId: string) {
		return this.scenes.where("project").equals(projectId).sortBy("order");
	}
	async getAllScenes() {
		return this.scenes.toArray();
	}

	// ==========================
	// 角色表 (已废弃，保留用于迁移)
	// @deprecated 请使用 Wiki 条目相关方法替代
	// ==========================
	/** @deprecated 使用 addWikiEntry 替代 */
	async addRole(role: Partial<RoleInterface>) {
		const now = dayjs().toISOString();
		const newRole: RoleInterface = {
			id: uuidv4(),
			project: role.project!,
			name: role.name || "New Role",
			alias: role.alias || [],
			identity: role.identity || [],
			relationships: role.relationships || [],
			basicSettings: role.basicSettings || "",
			image: role.image || [],
			experience: role.experience || "",
			showTip: role.showTip || false,
			createDate: now,
		};
		await this.roles.add(newRole);
		logger.info(`Added role ${newRole.name} (${newRole.id})`);
		return newRole;
	}

	/** @deprecated 使用 updateWikiEntry 替代 */
	async updateRole(id: string, updates: Partial<RoleInterface>) {
		await this.roles.update(id, updates);
		logger.info(`Updated role ${id}`);
	}

	/** @deprecated 使用 deleteWikiEntry 替代 */
	async deleteRole(id: string) {
		await this.roles.delete(id);
		logger.warn(`Deleted role ${id}`);
	}

	/** @deprecated 使用 getWikiEntry 替代 */
	async getRole(id: string) {
		return this.roles.get(id);
	}

	/** @deprecated 使用 getWikiEntriesByProject 替代 */
	async getRolesByProject(projectId: string) {
		return this.roles.where("project").equals(projectId).toArray();
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
			chapter: attachment.chapter,
			scene: attachment.scene,
			type: attachment.type || "file",
			fileName: attachment.fileName || "unknown",
			filePath: attachment.filePath || "",
			uploadedAt: dayjs().toISOString(),
			size: attachment.size,
			mimeType: attachment.mimeType,
		};
		await this.attachments.add(newAttachment);
		logger.info(
			`Added attachment ${newAttachment.fileName} (${newAttachment.id})`,
		);
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
	// Wiki条目表 (原角色系统升级)
	// ==========================
	async addWikiEntry(entry: Partial<WikiEntryInterface>) {
		const now = dayjs().toISOString();
		const newEntry: WikiEntryInterface = {
			id: uuidv4(),
			project: entry.project!,
			name: entry.name || "新条目",
			alias: entry.alias || [],
			tags: entry.tags || [],
			content: entry.content || "",
			createDate: now,
			updatedAt: now,
		};
		await this.wikiEntries.add(newEntry);
		logger.info(`Added wiki entry ${newEntry.name} (${newEntry.id})`);
		return newEntry;
	}

	async updateWikiEntry(id: string, updates: Partial<WikiEntryInterface>) {
		updates.updatedAt = dayjs().toISOString();
		await this.wikiEntries.update(id, updates);
		logger.info(`Updated wiki entry ${id}`);
	}

	async deleteWikiEntry(id: string) {
		await this.wikiEntries.delete(id);
		logger.warn(`Deleted wiki entry ${id}`);
	}

	async getWikiEntry(id: string) {
		return this.wikiEntries.get(id);
	}

	async getWikiEntriesByProject(projectId: string) {
		return this.wikiEntries.where("project").equals(projectId).toArray();
	}

	async searchWikiEntries(projectId: string, query: string) {
		const lowerQuery = query.toLowerCase();
		return this.wikiEntries
			.where("project")
			.equals(projectId)
			.and((entry) => 
				entry.name.toLowerCase().includes(lowerQuery) ||
				entry.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
				entry.alias.some(alias => alias.toLowerCase().includes(lowerQuery))
			)
			.toArray();
	}

	// 迁移角色数据到Wiki系统
	async migrateRolesToWiki(projectId: string) {
		const roles = await this.getRolesByProject(projectId);
		const migratedEntries = [];
		
		for (const role of roles) {
			// 将角色的experience转换为content
			let content = "";
			if (role.experience) {
				try {
					// 如果experience已经是JSON格式，直接使用
					JSON.parse(role.experience);
					content = role.experience;
				} catch {
					// 如果是纯文本，包装成Lexical格式
					content = JSON.stringify({
						root: {
							children: [
								{
									children: [
										{
											detail: 0,
											format: 0,
											mode: "normal",
											style: "",
											text: role.experience,
											type: "text",
											version: 1,
										},
									],
									direction: "ltr",
									format: "",
									indent: 0,
									type: "paragraph",
									version: 1,
								},
							],
							direction: "ltr",
							format: "",
							indent: 0,
							type: "root",
							version: 1,
						},
					});
				}
			}

			const wikiEntry: WikiEntryInterface = {
				id: uuidv4(),
				project: role.project,
				name: role.name,
				alias: role.alias,
				tags: role.identity, // 将identity转换为tags
				content,
				createDate: role.createDate,
				updatedAt: dayjs().toISOString(),
			};

			await this.wikiEntries.add(wikiEntry);
			migratedEntries.push(wikiEntry);
		}

		logger.info(`Migrated ${migratedEntries.length} roles to wiki entries for project ${projectId}`);
		return migratedEntries;
	}
}

// ==============================
// 初始化数据库（第一次使用时调用）
// ==============================
export async function initDatabase() {
	try {
		const existingUsers = await db.users.toArray();
		if (existingUsers.length === 0) {
			// 新建一个默认免费用户
			await db.addUser({
				username: "guest",
				displayName: "Guest User",
				plan: "free",
			});
			logger.info("✅ Created default guest user");
		}

		const dbVersion = await db.getDBVersion();
		if (dbVersion.length === 0) {
			await db.setDBVersion("1.0.0", "Initial database setup");
			logger.info("✅ Initialized DB version 1.0.0");
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
