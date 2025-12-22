/**
 * Save Service
 * Handles manual and automatic save functionality.
 * Based on Node file tree structure, uses ContentRepository for content storage.
 *
 * Supports org-mode style tag extraction:
 * - Automatically extracts tags from #+TAGS: lines on save
 * - Syncs to nodes.tags array
 * - Updates tags aggregate cache table
 *
 * Requirements: 1.2, 5.3, 6.2
 */
import * as E from "fp-ts/Either";
import type { SerializedEditorState } from "lexical";
import {
	getNodeById,
	syncTagCache,
	updateContentByNodeId,
	updateNode,
} from "@/db";
import logger from "@/log";
import { extractTagsFromContent } from "./save.utils";

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
			await updateContentByNodeId(documentId, contentString, "lexical")();

			// Update node's tags array
			if (tags.length > 0 || this.lastSavedContent.has(documentId)) {
				await updateNode(documentId, { tags })();

				// Get workspace for tag cache sync
				const nodeResult = await getNodeById(documentId)();
				const node = E.isRight(nodeResult) ? nodeResult.right : null;
				if (node) {
					await syncTagCache(node.workspace, tags)();
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
