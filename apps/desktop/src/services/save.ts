/**
 * 保存服务 - 处理手动和自动保存功能
 * 基于 Node 文件树结构，使用 ContentRepository 进行内容存储
 * 
 * 支持 org-mode 风格的标签提取：
 * - 保存时自动从 #+TAGS: 行提取标签
 * - 同步到 nodes.tags 数组
 * - 更新 tags 聚合缓存表
 *
 * Requirements: 5.3, 6.2
 */
import type { SerializedEditorState } from "lexical";
import logger from "@/log";
import { ContentRepository, NodeRepository } from "@/db/models";
import { syncTagsCache } from "./tags";

export interface SaveResult {
	success: boolean;
	error?: string;
	timestamp: Date;
	tags?: string[];
}

export interface SaveService {
	saveDocument(
		documentId: string,
		content: SerializedEditorState,
	): Promise<SaveResult>;
	hasUnsavedChanges(documentId: string): boolean;
}

// Debounce timeout in milliseconds (500ms as per requirements)
const DEBOUNCE_TIMEOUT = 500;

/**
 * 从 Lexical 编辑器状态中提取 #+TAGS: 标签
 */
function extractTagsFromContent(content: SerializedEditorState): string[] {
	const tags: string[] = [];

	function traverse(node: any) {
		// Check for FrontMatterNode with TAGS key
		if (node.type === "front-matter" && node.key?.toUpperCase() === "TAGS") {
			const value = node.value || "";
			const parsed = value.split(",").map((t: string) => t.trim()).filter(Boolean);
			tags.push(...parsed);
		}
		// Traverse children
		if (node.children && Array.isArray(node.children)) {
			for (const child of node.children) {
				traverse(child);
			}
		}
	}

	if (content.root) {
		traverse(content.root);
	}

	return [...new Set(tags)]; // Deduplicate
}

class SaveServiceImpl implements SaveService {
	private unsavedChanges = new Map<string, boolean>();
	private lastSavedContent = new Map<string, string>();
	private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

	/**
	 * 保存文档内容
	 * @param documentId - 节点 ID
	 * @param content - Lexical 序列化内容
	 */
	async saveDocument(
		documentId: string,
		content: SerializedEditorState,
	): Promise<SaveResult> {
		const timestamp = new Date();

		try {
			const contentString = JSON.stringify(content);
			const lastSaved = this.lastSavedContent.get(documentId);

			if (lastSaved === contentString) {
				return {
					success: true,
					timestamp,
				};
			}

			// Extract tags from #+TAGS: lines
			const tags = extractTagsFromContent(content);

			// Save content
			await ContentRepository.updateByNodeId(documentId, contentString, "lexical");
			
			// Update node's tags array
			if (tags.length > 0 || this.lastSavedContent.has(documentId)) {
				await NodeRepository.update(documentId, { tags });
				
				// Get workspace for tag cache sync
				const node = await NodeRepository.getById(documentId);
				if (node) {
					await syncTagsCache(node.workspace, tags);
				}
			}

			logger.info(`Saved document ${documentId} with ${tags.length} tags`);

			this.lastSavedContent.set(documentId, contentString);
			this.unsavedChanges.set(documentId, false);

			return {
				success: true,
				timestamp,
				tags,
			};
		} catch (error) {
			logger.error(`Failed to save document:`, error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				timestamp,
			};
		}
	}

	/**
	 * 防抖保存文档内容
	 */
	debouncedSave(documentId: string, content: SerializedEditorState): void {
		this.unsavedChanges.set(documentId, true);

		const existingTimer = this.debounceTimers.get(documentId);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		const timer = setTimeout(async () => {
			await this.saveDocument(documentId, content);
			this.debounceTimers.delete(documentId);
		}, DEBOUNCE_TIMEOUT);

		this.debounceTimers.set(documentId, timer);
	}

	hasUnsavedChanges(documentId: string): boolean {
		return this.unsavedChanges.get(documentId) ?? false;
	}

	markAsChanged(documentId: string): void {
		this.unsavedChanges.set(documentId, true);
	}

	markAsSaved(documentId: string, content: SerializedEditorState): void {
		this.unsavedChanges.set(documentId, false);
		this.lastSavedContent.set(documentId, JSON.stringify(content));
	}

	clearDocument(documentId: string): void {
		this.unsavedChanges.delete(documentId);
		this.lastSavedContent.delete(documentId);
		
		const timer = this.debounceTimers.get(documentId);
		if (timer) {
			clearTimeout(timer);
			this.debounceTimers.delete(documentId);
		}
	}

	async flushAll(): Promise<void> {
		for (const [documentId, timer] of this.debounceTimers.entries()) {
			clearTimeout(timer);
			this.debounceTimers.delete(documentId);
		}
	}
}

export const saveService = new SaveServiceImpl();
