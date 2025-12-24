/**
 * @file rename-drawing.action.ts
 * @description 重命名绘图 Action
 *
 * 功能说明：
 * - 重命名指定绘图
 * - 使用 TaskEither 进行错误处理
 *
 * @requirements 7.1, 7.4
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { updateDrawingName } from "@/db/drawing.db.fn";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";

/**
 * 重命名绘图
 *
 * 更新指定绘图的名称。
 *
 * @param drawingId - 绘图 ID
 * @param newName - 新名称
 * @returns TaskEither<AppError, void>
 */
export const renameDrawing = (
	drawingId: string,
	newName: string,
): TE.TaskEither<AppError, void> => {
	logger.start("[Action] 重命名绘图...");

	return pipe(
		updateDrawingName(drawingId, newName),
		TE.tap(() => {
			logger.success("[Action] 绘图重命名成功:", { drawingId, newName });
			return TE.right(undefined);
		}),
	);
};
