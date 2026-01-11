/**
 * @file actions/import/import-markdown.flow.ts
 * @description Markdown 导入 Flow
 *
 * 功能说明：
 * - 将 Markdown 内容导入为新节点
 * - 支持从 front matter 提取标题
 * - 使用 TaskEither 进行错误处理
 *
 * TODO: importDirectory（批量导入，暂不实现）
 */

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { addContent, addNode, getNextOrder } from "@/io/api";
import logger from "@/io/log";
import {
	importFromMarkdown,
	type MarkdownImportOptions,
} from "@/pipes/import/import.markdown.fn";
import type { NodeInterface } from "@/types/node";
import { type AppError, importError } from "@/utils/error.util";

/**
 * 导入 Markdown 内容参数
 */
export interface ImportMarkdownParams {
	/** 工作区 ID */
	readonly workspaceId: string;
	/** 父节点 ID（null 表示根级） */
	readonly parentId: string | null;
	/** Markdown 内容 */
	readonly content: string;
	/** 节点标题（可选，如果不提供则从内容提取） */
	readonly title?: string;
	/** 导入选项 */
	readonly options?: MarkdownImportOptions;
}

/**
 * 导入结果
 */
export interface ImportResult {
	/** 创建的节点 */
	readonly node: NodeInterface;
	/** 解析的 front matter（如果有） */
	readonly frontMatter?: Record<string, unknown>;
}

/**
 * 导入 Markdown 内容为新节点
 *
 * 解析 Markdown 内容，创建新节点并保存转换后的 Lexical JSON 内容。
 *
 * @param params - 导入参数
 * @returns TaskEither<AppError, ImportResult>
 */
export const importMarkdown = (
	params: ImportMarkdownParams,
): TE.TaskEither<AppError, ImportResult> => {
	logger.start("[Action] 导入 Markdown...");

	return pipe(
		// 1. 解析 Markdown 内容
		TE.fromEither(
			pipe(
				importFromMarkdown(params.content, {
					...params.options,
					extractTitle: true,
				}),
				E.mapLeft((err) => importError(`Markdown 解析失败: ${err.message}`)),
			),
		),
		// 2. 确定标题
		TE.chain((importResult) => {
			const title =
				params.title ||
				importResult.title ||
				(importResult.frontMatter?.title as string | undefined) ||
				"导入的文档";

			// 3. 获取下一个排序号并创建节点
			return pipe(
				getNextOrder(params.parentId, params.workspaceId),
				TE.chain((order) =>
					addNode(params.workspaceId, title, {
						parent: params.parentId,
						type: "file",
						order,
						collapsed: true,
					}),
				),
				// 4. 创建内容记录
				TE.chainFirst((node) => {
					const lexicalJson = JSON.stringify(importResult.document);
					return addContent(node.id, lexicalJson);
				}),
				// 5. 返回结果
				TE.map((node) => ({
					node,
					frontMatter: importResult.frontMatter,
				})),
			);
		}),
		// 6. 记录成功日志
		TE.tap((result) => {
			logger.success("[Action] Markdown 导入成功:", result.node.id);
			return TE.right(result);
		}),
	);
};

/**
 * 直接导入 Markdown 内容为 Lexical JSON（不创建节点）
 *
 * 用于预览或直接转换场景。
 *
 * @param content - Markdown 内容
 * @param options - 导入选项
 * @returns Either<AppError, string> - Lexical JSON 字符串
 */
export const importMarkdownToJson = (
	content: string,
	options?: MarkdownImportOptions,
): E.Either<AppError, string> => {
	logger.info("[Action] 直接导入 Markdown 为 JSON");

	return pipe(
		importFromMarkdown(content, options),
		E.mapLeft((err) => importError(`Markdown 解析失败: ${err.message}`)),
		E.map((result) => JSON.stringify(result.document)),
	);
};
