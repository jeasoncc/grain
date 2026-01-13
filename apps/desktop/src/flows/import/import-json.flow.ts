/**
 * @file actions/import/import-json.flow.ts
 * @description 从 JSON 导入数据 Flow
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
import { legacyDatabase } from "@/io/db/legacy-database";
import { info, success } from "@/io/log/logger.api";
import {
	type JsonImportOptions,
	parseImportData,
} from "@/pipes/import/import.json.fn";
import type { NodeInterface } from "@/types/node";
import type { WorkspaceInterface } from "@/types/workspace";
import type { AppError } from "@/types/error";

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
	info("[Import] 开始导入数据...", {}, "import-json.flow");

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
						await legacyDatabase.workspaces.put(w as WorkspaceInterface);
					}
					info("[Import] 工作区导入完成", { count: data.workspaces.length }, "import-json.flow");

					// 导入节点
					for (const n of data.nodes) {
						await legacyDatabase.nodes.put(n as NodeInterface);
					}
					info("[Import] 节点导入完成", { count: data.nodes.length }, "import-json.flow");

					// 导入内容
					for (const c of data.contents) {
						await legacyDatabase.contents.put(c as never);
					}
					info("[Import] 内容导入完成", { count: data.contents.length }, "import-json.flow");

					// 导入附件
					for (const a of data.attachments) {
						await legacyDatabase.attachments.put(a as never);
					}
					info("[Import] 附件导入完成", { count: data.attachments.length }, "import-json.flow");

					success("[Import] 数据导入成功");
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
	options: { readonly keepIds?: boolean } = {},
): Promise<void> {
	const result = await importFromJson(jsonText, options)();
	if (E.isLeft(result)) {
		throw new Error(result.left.message);
	}
}
