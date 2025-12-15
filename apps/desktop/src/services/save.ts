/**
 * 保存服务 - 处理手动和自动保存功能
 * 基于 Node 文件树结构，使用 ContentRepository 进行内容存储
 *
 * Requirements: 5.3, 6.2
 */
import type { SerializedEditorState } from "lexical";
import logger from "@/log";
import { ContentRepository } from "@/db/models";

export interface SaveResult {
	success: boolean;
	error?: string;
	timestamp: Date;
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

			await ContentRepository.updateByNodeId(documentId, contentString, "lexical");
			logger.info(`Saved document ${documentId}`);

			this.lastSavedContent.set(documentId, contentString);
			this.unsavedChanges.set(documentId, false);

			return {
				success: true,
				timestamp,
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
