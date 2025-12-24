/**
 * @file actions/import/import-json.action.ts
 * @description 从 JSON 导入数据 Action
 *
 * 功能说明：
 * - 从 JSON 备份导入数据
 * - 使用纯函数解析和转换数据
 * - 使用直接数据库访问进行批量插入
 */

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { toast } from "sonner";
import { database } from "@/db/database";
import {
	type JsonImportOptions,
	parseImportData,
} from "@/fn/import/import.json.fn";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";
import type { NodeInterface } from "@/types/node";
import type { WorkspaceInterface } from "@/types/workspace";

/**
 * 从 JSON 导入数据
 *
 * @param jsonText - JSON 字符串
 * @param options - 导入选项
 * @returns TaskEither<AppError, void>
 */
export function importFromJson(
	jsonText: string,
	options: JsonImportOptions = {},
): TE.TaskEither<AppError, void> {
	logger.start("[Import] 开始导入数据...");

	return pipe(
		// 解析和转换数据
		TE.fromEither(
			pipe(
				parseImportData(jsonText, options),
				E.mapLeft(
					(error): AppError => ({
						type: "IMPORT_ERROR",
						message: error.message,
					}),
				),
			),
		),
		// 写入数据库
		TE.chain((data) =>
			TE.tryCatch(
				async () => {
					// 导入工作区
					for (const w of data.workspaces) {
						await database.workspaces.put(w as WorkspaceInterface);
					}
					logger.info("[Import] 工作区导入完成:", data.workspaces.length);

					// 导入节点
					for (const n of data.nodes) {
						await database.nodes.put(n as NodeInterface);
					}
					logger.info("[Import] 节点导入完成:", data.nodes.length);

					// 导入内容
					for (const c of data.contents) {
						await database.contents.put(c as never);
					}
					logger.info("[Import] 内容导入完成:", data.contents.length);

					// 导入附件
					for (const a of data.attachments) {
						await database.attachments.put(a as never);
					}
					logger.info("[Import] 附件导入完成:", data.attachments.length);

					logger.success("[Import] 数据导入成功");
					toast.success("Import completed");
				},
				(error): AppError => ({
					type: "DB_ERROR",
					message: `数据库写入失败: ${error instanceof Error ? error.message : String(error)}`,
				}),
			),
		),
	);
}

/**
 * 从 JSON 导入数据（Promise 版本，向后兼容）
 *
 * @param jsonText - JSON 字符串
 * @param options - 导入选项
 * @returns Promise<void>
 */
export async function importFromJsonAsync(
	jsonText: string,
	options: { keepIds?: boolean } = {},
): Promise<void> {
	const result = await importFromJson(jsonText, options)();
	if (E.isLeft(result)) {
		throw new Error(result.left.message);
	}
}
