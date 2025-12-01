/**
 * 全局搜索服务
 * 支持跨项目、章节、场景的全文搜索
 */

import lunr from "lunr";
import { db } from "@/db/curd";
import type {
	ChapterInterface,
	ProjectInterface,
	RoleInterface,
	SceneInterface,
	WorldEntryInterface,
} from "@/db/schema";
import logger from "@/log/index";

export type SearchResultType =
	| "project"
	| "chapter"
	| "scene"
	| "role"
	| "world";

export interface SearchResult {
	id: string;
	type: SearchResultType;
	title: string;
	content: string;
	excerpt: string; // 匹配的文本片段
	projectId?: string;
	projectTitle?: string;
	chapterId?: string;
	chapterTitle?: string;
	score: number; // 相关性分数
	highlights: string[]; // 高亮的关键词
}

export interface SearchOptions {
	types?: SearchResultType[]; // 搜索类型过滤
	projectId?: string; // 限定项目
	limit?: number; // 结果数量限制
	fuzzy?: boolean; // 模糊搜索
}

/**
 * 全局搜索引擎
 */
export class SearchEngine {
	private sceneIndex: lunr.Index | null = null;
	private roleIndex: lunr.Index | null = null;
	private worldIndex: lunr.Index | null = null;
	private indexedData: Map<string, any> = new Map();
	private isIndexing = false;

	/**
	 * 构建搜索索引
	 */
	async buildIndex() {
		if (this.isIndexing) {
			logger.warn("索引构建中，请稍候");
			return;
		}

		this.isIndexing = true;
		logger.info("开始构建搜索索引...");

		try {
			const [scenes, roles, worldEntries] = await Promise.all([
				db.scenes.toArray(),
				db.roles.toArray(),
				db.worldEntries.toArray(),
			]);

			// 构建场景索引
			this.sceneIndex = lunr(function (this: lunr.Builder) {
				this.ref("id");
				this.field("title", { boost: 10 });
				this.field("content");

				// 支持中文分词（简单实现）
				this.pipeline.remove(lunr.stemmer);
				this.searchPipeline.remove(lunr.stemmer);

				for (const scene of scenes) {
					const content = extractTextFromScene(scene);
					this.add({
						id: scene.id,
						title: scene.title,
						content,
					});
				}
			});

			// 构建角色索引
			this.roleIndex = lunr(function (this: lunr.Builder) {
				this.ref("id");
				this.field("name", { boost: 10 });
				this.field("alias", { boost: 5 });
				this.field("identity");
				this.field("basicSettings");
				this.field("experience");

				this.pipeline.remove(lunr.stemmer);
				this.searchPipeline.remove(lunr.stemmer);

				for (const role of roles) {
					this.add({
						id: role.id,
						name: role.name,
						alias: role.alias.join(" "),
						identity: role.identity.join(" "),
						basicSettings: role.basicSettings,
						experience: role.experience,
					});
				}
			});

			// 构建世界观索引
			this.worldIndex = lunr(function (this: lunr.Builder) {
				this.ref("id");
				this.field("name", { boost: 10 });
				this.field("summary");
				this.field("tags", { boost: 5 });

				this.pipeline.remove(lunr.stemmer);
				this.searchPipeline.remove(lunr.stemmer);

				for (const entry of worldEntries) {
					this.add({
						id: entry.id,
						name: entry.name,
						summary: entry.summary,
						tags: entry.tags?.join(" ") || "",
					});
				}
			});

			// 缓存原始数据
			this.indexedData.clear();
			for (const scene of scenes) this.indexedData.set(scene.id, scene);
			for (const role of roles) this.indexedData.set(role.id, role);
			for (const entry of worldEntries) this.indexedData.set(entry.id, entry);

			logger.success(
				`索引构建完成: ${scenes.length} 场景, ${roles.length} 角色, ${worldEntries.length} 世界观条目`,
			);
		} catch (error) {
			logger.error("索引构建失败:", error);
			throw error;
		} finally {
			this.isIndexing = false;
		}
	}

	/**
	 * 执行搜索
	 */
	async search(
		query: string,
		options: SearchOptions = {},
	): Promise<SearchResult[]> {
		if (!query.trim()) return [];

		// 确保索引已构建
		if (!this.sceneIndex || !this.roleIndex || !this.worldIndex) {
			await this.buildIndex();
		}

		const {
			types = ["scene", "role", "world"],
			projectId,
			limit = 50,
			fuzzy = true,
		} = options;

		const results: SearchResult[] = [];

		// 处理搜索查询（支持模糊搜索）
		const searchQuery = fuzzy ? `${query}~1 ${query}*` : query;

		try {
			// 搜索场景
			if (types.includes("scene") && this.sceneIndex) {
				const sceneResults = this.sceneIndex.search(searchQuery);
				for (const result of sceneResults) {
					const scene = this.indexedData.get(result.ref) as SceneInterface;
					if (!scene) continue;
					if (projectId && scene.project !== projectId) continue;

					const [project, chapter] = await Promise.all([
						db.projects.get(scene.project),
						db.chapters.get(scene.chapter),
					]);

					const content = extractTextFromScene(scene);
					const excerpt = generateExcerpt(content, query);

					results.push({
						id: scene.id,
						type: "scene",
						title: scene.title,
						content,
						excerpt,
						projectId: scene.project,
						projectTitle: project?.title,
						chapterId: scene.chapter,
						chapterTitle: chapter?.title,
						score: result.score,
						highlights: extractHighlights(content, query),
					});
				}
			}

			// 搜索角色
			if (types.includes("role") && this.roleIndex) {
				const roleResults = this.roleIndex.search(searchQuery);
				for (const result of roleResults) {
					const role = this.indexedData.get(result.ref) as RoleInterface;
					if (!role) continue;
					if (projectId && role.project !== projectId) continue;

					const project = await db.projects.get(role.project);
					const content = `${role.name} ${role.alias.join(" ")} ${role.basicSettings} ${role.experience}`;
					const excerpt = generateExcerpt(content, query);

					results.push({
						id: role.id,
						type: "role",
						title: role.name,
						content,
						excerpt,
						projectId: role.project,
						projectTitle: project?.title,
						score: result.score,
						highlights: extractHighlights(content, query),
					});
				}
			}

			// 搜索世界观
			if (types.includes("world") && this.worldIndex) {
				const worldResults = this.worldIndex.search(searchQuery);
				for (const result of worldResults) {
					const entry = this.indexedData.get(result.ref) as WorldEntryInterface;
					if (!entry) continue;
					if (projectId && entry.project !== projectId) continue;

					const project = await db.projects.get(entry.project);
					const content = `${entry.name} ${entry.summary}`;
					const excerpt = generateExcerpt(content, query);

					results.push({
						id: entry.id,
						type: "world",
						title: entry.name,
						content,
						excerpt,
						projectId: entry.project,
						projectTitle: project?.title,
						score: result.score,
						highlights: extractHighlights(content, query),
					});
				}
			}

			// 按相关性排序并限制数量
			results.sort((a, b) => b.score - a.score);
			return results.slice(0, limit);
		} catch (error) {
			logger.error("搜索失败:", error);
			return [];
		}
	}

	/**
	 * 简单搜索（不使用索引，适合实时搜索）
	 */
	async simpleSearch(
		query: string,
		options: SearchOptions = {},
	): Promise<SearchResult[]> {
		if (!query.trim()) return [];

		const {
			types = ["scene", "role", "world"],
			projectId,
			limit = 50,
		} = options;

		const results: SearchResult[] = [];
		const lowerQuery = query.toLowerCase();

		try {
			// 搜索场景
			if (types.includes("scene")) {
				const scenes = projectId
					? await db.scenes.where("project").equals(projectId).toArray()
					: await db.scenes.toArray();

				for (const scene of scenes) {
					const content = extractTextFromScene(scene);
					if (
						scene.title.toLowerCase().includes(lowerQuery) ||
						content.toLowerCase().includes(lowerQuery)
					) {
						const [project, chapter] = await Promise.all([
							db.projects.get(scene.project),
							db.chapters.get(scene.chapter),
						]);

						results.push({
							id: scene.id,
							type: "scene",
							title: scene.title,
							content,
							excerpt: generateExcerpt(content, query),
							projectId: scene.project,
							projectTitle: project?.title,
							chapterId: scene.chapter,
							chapterTitle: chapter?.title,
							score: calculateSimpleScore(scene.title, content, query),
							highlights: extractHighlights(content, query),
						});
					}
				}
			}

			// 搜索角色
			if (types.includes("role")) {
				const roles = projectId
					? await db.roles.where("project").equals(projectId).toArray()
					: await db.roles.toArray();

				for (const role of roles) {
					const content = `${role.name} ${role.alias.join(" ")} ${role.basicSettings} ${role.experience}`;
					if (content.toLowerCase().includes(lowerQuery)) {
						const project = await db.projects.get(role.project);

						results.push({
							id: role.id,
							type: "role",
							title: role.name,
							content,
							excerpt: generateExcerpt(content, query),
							projectId: role.project,
							projectTitle: project?.title,
							score: calculateSimpleScore(role.name, content, query),
							highlights: extractHighlights(content, query),
						});
					}
				}
			}

			// 搜索世界观
			if (types.includes("world")) {
				const worldEntries = projectId
					? await db.worldEntries.where("project").equals(projectId).toArray()
					: await db.worldEntries.toArray();

				for (const entry of worldEntries) {
					const content = `${entry.name} ${entry.summary}`;
					if (content.toLowerCase().includes(lowerQuery)) {
						const project = await db.projects.get(entry.project);

						results.push({
							id: entry.id,
							type: "world",
							title: entry.name,
							content,
							excerpt: generateExcerpt(content, query),
							projectId: entry.project,
							projectTitle: project?.title,
							score: calculateSimpleScore(entry.name, content, query),
							highlights: extractHighlights(content, query),
						});
					}
				}
			}

			// 按分数排序并限制数量
			results.sort((a, b) => b.score - a.score);
			return results.slice(0, limit);
		} catch (error) {
			logger.error("简单搜索失败:", error);
			return [];
		}
	}

	/**
	 * 清除索引
	 */
	clearIndex() {
		this.sceneIndex = null;
		this.roleIndex = null;
		this.worldIndex = null;
		this.indexedData.clear();
		logger.info("搜索索引已清除");
	}
}

// 辅助函数：从场景中提取文本
function extractTextFromScene(scene: SceneInterface): string {
	try {
		const content =
			typeof scene.content === "string"
				? JSON.parse(scene.content)
				: scene.content;
		if (!content || !content.root) return "";
		const children = content.root.children || [];
		return children
			.map((node: any) => {
				if (node.type === "paragraph" || node.type === "heading") {
					return (
						node.children?.map((child: any) => child.text || "").join("") || ""
					);
				}
				return "";
			})
			.join("\n");
	} catch {
		return typeof scene.content === "string" ? scene.content : "";
	}
}

// 辅助函数：生成摘要
function generateExcerpt(
	content: string,
	query: string,
	contextLength = 100,
): string {
	const lowerContent = content.toLowerCase();
	const lowerQuery = query.toLowerCase();
	const index = lowerContent.indexOf(lowerQuery);

	if (index === -1) {
		return (
			content.slice(0, contextLength) +
			(content.length > contextLength ? "..." : "")
		);
	}

	const start = Math.max(0, index - contextLength / 2);
	const end = Math.min(
		content.length,
		index + query.length + contextLength / 2,
	);

	let excerpt = content.slice(start, end);
	if (start > 0) excerpt = "..." + excerpt;
	if (end < content.length) excerpt = excerpt + "...";

	return excerpt;
}

// 辅助函数：提取高亮关键词
function extractHighlights(
	content: string,
	query: string,
	maxHighlights = 3,
): string[] {
	const highlights: string[] = [];
	const lowerContent = content.toLowerCase();
	const lowerQuery = query.toLowerCase();

	let index = 0;
	while (highlights.length < maxHighlights) {
		index = lowerContent.indexOf(lowerQuery, index);
		if (index === -1) break;

		const start = Math.max(0, index - 20);
		const end = Math.min(content.length, index + query.length + 20);
		highlights.push(content.slice(start, end));

		index += query.length;
	}

	return highlights;
}

// 辅助函数：计算简单相关性分数
function calculateSimpleScore(
	title: string,
	content: string,
	query: string,
): number {
	const lowerTitle = title.toLowerCase();
	const lowerContent = content.toLowerCase();
	const lowerQuery = query.toLowerCase();

	let score = 0;

	// 标题完全匹配
	if (lowerTitle === lowerQuery) score += 100;
	// 标题包含
	else if (lowerTitle.includes(lowerQuery)) score += 50;

	// 内容匹配次数
	const matches = (lowerContent.match(new RegExp(lowerQuery, "g")) || [])
		.length;
	score += matches * 10;

	return score;
}

// 导出单例
export const searchEngine = new SearchEngine();
