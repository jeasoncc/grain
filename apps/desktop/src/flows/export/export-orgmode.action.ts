/**
 * @file export-orgmode.action.ts
 * @description Org-mode 导出 Action
 *
 * 功能说明：
 * - 将节点内容导出为 Org-mode 格式
 * - 支持单文件导出
 * - 使用 TaskEither 进行错误处理
 *
 * TODO: exportWorkspace（全局导出，暂不实现）
 */

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { exportToOrgmode, type OrgmodeExportOptions } from "@/pipes/export";
import { type AppError, exportError } from "@/utils/error.util";
import logger from "@/log";
import { getContentByNodeIdOrFail, getNodeByIdOrFail } from "@/io/api";

/**
 * 导出节点内容为 Org-mode 格式参数
 */
export interface ExportOrgmodeParams {
	/** 节点 ID */
	readonly nodeId: string;
	/** 导出选项 */
	readonly options?: OrgmodeExportOptions;
}

/**
 * 导出结果
 */
export interface ExportResult {
	/** 导出的内容 */
	readonly content: string;
	/** 文件名（不含扩展名） */
	readonly filename: string;
	/** 文件扩展名 */
	readonly extension: string;
}

/**
 * 导出节点内容为 Org-mode 格式
 *
 * 获取节点内容并转换为 Org-mode 格式。
 *
 * @param params - 导出参数
 * @returns TaskEither<AppError, ExportResult>
 */
export const exportNodeToOrgmode = (
	params: ExportOrgmodeParams,
): TE.TaskEither<AppError, ExportResult> => {
	logger.start("[Action] 导出 Org-mode...");

	return pipe(
		// 并行获取节点和内容
		TE.Do,
		TE.bind("node", () => getNodeByIdOrFail(params.nodeId)),
		TE.bind("contentRecord", () => getContentByNodeIdOrFail(params.nodeId)),
		TE.chain(({ node, contentRecord }) => {
			// 设置导出选项，包含标题
			const exportOptions: OrgmodeExportOptions = {
				...params.options,
				includeTitle: params.options?.includeTitle ?? true,
				title: params.options?.title ?? node.title,
			};

			// 转换为 Org-mode
			const result = exportToOrgmode(contentRecord.content, exportOptions);

			return pipe(
				result,
				E.mapLeft((err) => exportError(`Org-mode 导出失败: ${err.message}`)),
				TE.fromEither,
				TE.map((content) => ({
					content,
					filename: node.title,
					extension: "org",
				})),
			);
		}),
		TE.tap((result) => {
			logger.success("[Action] Org-mode 导出成功:", result.filename);
			return TE.right(result);
		}),
	);
};

/**
 * 直接导出内容为 Org-mode 格式（不从数据库获取）
 *
 * 用于已有内容的直接转换。
 *
 * @param content - Lexical JSON 内容字符串
 * @param options - 导出选项
 * @returns Either<AppError, string>
 */
export const exportContentToOrgmode = (
	content: string,
	options?: OrgmodeExportOptions,
): E.Either<AppError, string> => {
	logger.info("[Action] 直接导出 Org-mode");

	return pipe(
		exportToOrgmode(content, options),
		E.mapLeft((err) => exportError(`Org-mode 导出失败: ${err.message}`)),
	);
};
