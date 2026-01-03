/**
 * @file fn/save/save.document.fn.ts
 * @description 文档保存纯函数
 *
 * 提供文档保存的核心逻辑：
 * - 内容序列化和比较
 * - 标签提取和同步
 * - 数据库操作编排
 *
 * Requirements: 1.2, 5.3, 6.2
 */

import dayjs from "dayjs";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import type { SerializedEditorState } from "lexical";
// TODO: Phase 4 - 迁移到 repo/tag.repo.fn.ts
import { syncTagCache } from "@/db";
import {
	getNode,
	updateNode,
	updateContentByNodeId,
} from "@/repo";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";
import { extractTagsFromContent } from "./save.debounce.fn";

// ============================================================================
// Types
// ============================================================================

/**
 * 保存结果
 */
export interface SaveResult {
	readonly success: boolean;
	readonly error?: string;
	readonly timestamp: Date;
	readonly tags?: string[];
	readonly documentId: string;
}

/**
 * 保存参数
 */
export interface SaveDocumentParams {
	readonly documentId: string;
	readonly content: SerializedEditorState;
	readonly previousContent?: string;
}

// ============================================================================
// Pure Helper Functions
// ============================================================================

/**
 * 序列化编辑器内容为字符串
 */
export const serializeContent = (content: SerializedEditorState): string =>
	JSON.stringify(content);

/**
 * 检查内容是否有变化
 */
export const hasContentChanged = (
	newContent: string,
	previousContent: string | undefined,
): boolean => previousContent !== newContent;

/**
 * 创建成功的保存结果
 */
export const createSuccessResult = (
	documentId: string,
	tags: string[],
): SaveResult => ({
	success: true,
	timestamp: dayjs().toDate(),
	tags,
	documentId,
});

/**
 * 创建失败的保存结果
 */
export const createErrorResult = (
	documentId: string,
	error: string,
): SaveResult => ({
	success: false,
	error,
	timestamp: dayjs().toDate(),
	documentId,
});

/**
 * 创建无变化的保存结果
 */
export const createNoChangeResult = (documentId: string): SaveResult => ({
	success: true,
	timestamp: dayjs().toDate(),
	documentId,
});

// ============================================================================
// Database Operations (TaskEither)
// ============================================================================

/**
 * 保存内容到数据库
 */
const saveContentToDb = (
	documentId: string,
	contentString: string,
): TE.TaskEither<AppError, void> =>
	pipe(
		TE.tryCatch(
			async () => {
				await updateContentByNodeId(documentId, contentString, "lexical")();
			},
			(error): AppError => ({
				type: "DB_ERROR",
				message: `保存内容失败: ${error}`,
			}),
		),
	);

/**
 * 更新节点标签
 */
const updateNodeTags = (
	documentId: string,
	tags: string[],
): TE.TaskEither<AppError, void> =>
	pipe(
		TE.tryCatch(
			async () => {
				await updateNode(documentId, { tags })();
			},
			(error): AppError => ({
				type: "DB_ERROR",
				message: `更新节点标签失败: ${error}`,
			}),
		),
	);

/**
 * 同步标签缓存
 */
const syncTagCacheForWorkspace = (
	workspaceId: string,
	tags: string[],
): TE.TaskEither<AppError, void> =>
	pipe(
		TE.tryCatch(
			async () => {
				await syncTagCache(workspaceId, tags)();
			},
			(error): AppError => ({
				type: "DB_ERROR",
				message: `同步标签缓存失败: ${error}`,
			}),
		),
	);

/**
 * 获取节点的工作区 ID
 */
const getWorkspaceId = (
	documentId: string,
): TE.TaskEither<AppError, string | null> =>
	pipe(
		getNode(documentId),
		TE.map((node) => node?.workspace ?? null),
	);

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * 保存文档内容（纯函数版本）
 *
 * 执行以下操作：
 * 1. 序列化内容
 * 2. 检查内容是否有变化
 * 3. 提取标签
 * 4. 保存内容到数据库
 * 5. 更新节点标签
 * 6. 同步标签缓存
 *
 * @param params - 保存参数
 * @returns TaskEither 包含保存结果或错误
 */
export const saveDocument = (
	params: SaveDocumentParams,
): TE.TaskEither<AppError, SaveResult> => {
	const { documentId, content, previousContent } = params;
	const contentString = serializeContent(content);

	// 如果内容没有变化，直接返回成功
	if (!hasContentChanged(contentString, previousContent)) {
		logger.info("[Save] 内容无变化，跳过保存:", documentId);
		return TE.right(createNoChangeResult(documentId));
	}

	// 提取标签
	const tags = extractTagsFromContent(content);

	logger.start("[Save] 开始保存文档:", documentId);

	return pipe(
		// 1. 保存内容
		saveContentToDb(documentId, contentString),
		// 2. 更新节点标签（如果有标签）
		TE.chain(() =>
			tags.length > 0 ? updateNodeTags(documentId, tags) : TE.right(undefined),
		),
		// 3. 获取工作区 ID 并同步标签缓存
		TE.chain(() =>
			tags.length > 0
				? pipe(
						getWorkspaceId(documentId),
						TE.chain((workspaceId) =>
							workspaceId
								? syncTagCacheForWorkspace(workspaceId, tags)
								: TE.right(undefined),
						),
					)
				: TE.right(undefined),
		),
		// 4. 返回成功结果
		TE.map(() => {
			logger.success(
				"[Save] 文档保存成功:",
				documentId,
				`(${tags.length} 个标签)`,
			);
			return createSuccessResult(documentId, tags);
		}),
		// 5. 错误处理
		TE.mapLeft((error) => {
			logger.error("[Save] 文档保存失败:", documentId, error);
			return error;
		}),
	);
};

/**
 * 执行保存并返回 Promise（便于在非 fp-ts 环境中使用）
 */
export const saveDocumentAsync = async (
	params: SaveDocumentParams,
): Promise<SaveResult> => {
	const result = await saveDocument(params)();
	return E.isRight(result)
		? result.right
		: createErrorResult(params.documentId, result.left.message);
};
