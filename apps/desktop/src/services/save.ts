/**
 * 保存服务 - 处理手动和自动保存功能
 */
import type { SerializedEditorState } from "lexical";
import { toast } from "sonner";
import logger from "@/log";
import { db } from "@/db/curd";

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

class SaveServiceImpl implements SaveService {
	private unsavedChanges = new Map<string, boolean>();
	private lastSavedContent = new Map<string, string>();

	async saveDocument(
		documentId: string,
		content: SerializedEditorState,
	): Promise<SaveResult> {
		const timestamp = new Date();

		try {
			// 将内容序列化为字符串进行比较
			const contentString = JSON.stringify(content);
			const lastSaved = this.lastSavedContent.get(documentId);

			// 如果内容没有变化，跳过保存
			if (lastSaved === contentString) {
				return {
					success: true,
					timestamp,
				};
			}

			// 保存到数据库
			await db.updateScene(documentId, {
				content: contentString,
				lastEdit: timestamp.toISOString(),
			});

			// 更新缓存
			this.lastSavedContent.set(documentId, contentString);
			this.unsavedChanges.set(documentId, false);

			return {
				success: true,
				timestamp,
			};
		} catch (error) {
			logger.error("Failed to save document:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				timestamp,
			};
		}
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
	}
}

// 单例实例
export const saveService = new SaveServiceImpl();
