/**
 * @file delete-drawing.action.ts
 * @description 删除绘图 Action
 *
 * 功能说明：
 * - 删除指定绘图
 * - 使用 TaskEither 进行错误处理
 *
 * @requirements 7.1, 7.4
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { deleteDrawing as deleteDrawingDb } from "@/db/drawing.db.fn";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";

/**
 * 删除绘图
 *
 * 删除指定 ID 的绘图。
 *
 * @param drawingId - 绘图 ID
 * @returns TaskEither<AppError, void>
 */
export const deleteDrawing = (
	drawingId: string,
): TE.TaskEither<AppError, void> => {
	logger.start("[Action] 删除绘图...");

	return pipe(
		deleteDrawingDb(drawingId),
		TE.tap(() => {
			logger.success("[Action] 绘图删除成功:", drawingId);
			return TE.right(undefined);
		}),
	);
};
