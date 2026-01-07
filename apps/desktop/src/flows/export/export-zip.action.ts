/**
 * @file export-zip.action.ts
 * @description 导出数据为 ZIP 压缩包 Action
 *
 * 功能说明：
 * - 导出数据为 ZIP 压缩包
 * - 使用 exportAll 获取 JSON 数据
 * - 使用 JSZip 创建压缩包
 */

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { createZipBundle } from "@/pipes/export/export.bundle.fn";
import type { AppError } from "@/utils/error.util";
import logger from '@/io/log';
import { exportAll } from "./export-all.action";

/**
 * 导出数据为 ZIP 压缩包
 *
 * @param workspaceId - 可选的工作区 ID
 * @returns TaskEither<AppError, Blob>
 */
export function exportAllAsZip(
	workspaceId?: string,
): TE.TaskEither<AppError, Blob> {
	logger.start("[Export] 开始导出 ZIP 压缩包...");

	return pipe(
		exportAll(workspaceId),
		TE.chain((jsonData) =>
			TE.tryCatch(
				async () => {
					const blob = await createZipBundle(jsonData);
					logger.success("[Export] ZIP 压缩包导出成功");
					return blob;
				},
				(error): AppError => ({
					type: "EXPORT_ERROR",
					message: `创建 ZIP 压缩包失败: ${error instanceof Error ? error.message : String(error)}`,
				}),
			),
		),
	);
}

/**
 * 导出数据为 ZIP 压缩包（Promise 版本，向后兼容）
 *
 * @param workspaceId - 可选的工作区 ID
 * @returns Promise<Blob>
 */
export async function exportAllAsZipAsync(workspaceId?: string): Promise<Blob> {
	const result = await exportAllAsZip(workspaceId)();
	if (E.isLeft(result)) {
		throw new Error(result.left.message);
	}
	return result.right;
}
