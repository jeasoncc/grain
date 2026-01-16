/**
 * @file actions/import/import-json.flow.ts
 * @description 从 JSON 导入数据 Flow
 *
 * 功能说明：
 * - 从 JSON 备份导入数据
 * - 使用纯函数解析和转换数据
 * - 使用 SQLite API 进行批量插入
 */

import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { toast } from "sonner"
import { createContent } from "@/io/api/content.api"
import { createNode } from "@/io/api/node.api"
import { createWorkspace } from "@/io/api/workspace.api"
import { info, success } from "@/io/log/logger.api"
import { type JsonImportOptions, parseImportData } from "@/pipes/import/import.json.fn"
import type { AppError } from "@/types/error"

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
	info("[Import] 开始导入数据...", {}, "import-json.flow")

	return pipe(
		// 解析和转换数据
		TE.fromEither(
			pipe(
				parseImportData(jsonText, options),
				E.mapLeft(
					(error): AppError => ({
						message: error.message,
						type: "IMPORT_ERROR",
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
						const result = await createWorkspace(w)()
						if (E.isLeft(result)) {
							throw new Error(`Failed to import workspace: ${result.left.message}`)
						}
					}
					info("[Import] 工作区导入完成", { count: data.workspaces.length }, "import-json.flow")

					// 导入节点
					for (const n of data.nodes) {
						const result = await createNode(n)()
						if (E.isLeft(result)) {
							throw new Error(`Failed to import node: ${result.left.message}`)
						}
					}
					info("[Import] 节点导入完成", { count: data.nodes.length }, "import-json.flow")

					// 导入内容
					for (const c of data.contents) {
						const result = await createContent(c)()
						if (E.isLeft(result)) {
							throw new Error(`Failed to import content: ${result.left.message}`)
						}
					}
					info("[Import] 内容导入完成", { count: data.contents.length }, "import-json.flow")

					// 注意：附件导入功能需要根据新的 SQLite API 实现
					// 目前跳过附件导入，因为 SQLite API 中可能没有对应的接口
					if (data.attachments.length > 0) {
						info(
							"[Import] 跳过附件导入 (需要 SQLite API 支持)",
							{ count: data.attachments.length },
							"import-json.flow",
						)
					}

					success("[Import] 数据导入成功")
					toast.success("Import completed")
				},
				(error): AppError => ({
					message: `数据库写入失败: ${error instanceof Error ? error.message : String(error)}`,
					type: "DB_ERROR",
				}),
			),
		),
	)
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
	const result = await importFromJson(jsonText, options)()
	if (E.isLeft(result)) {
		throw new Error(result.left.message)
	}
}
