/**
 * @file save-drawing-content.action.ts
 * @description 保存绘图内容 Action
 *
 * 功能说明：
 * - 保存绘图的 Excalidraw 内容
 * - 支持更新尺寸
 * - 使用 TaskEither 进行错误处理
 *
 * @requirements 7.1, 7.4
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { updateDrawing } from "@/db/drawing.db.fn";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";

/**
 * 保存绘图内容参数
 */
export interface SaveDrawingContentParams {
	/** 绘图 ID */
	readonly drawingId: string;
	/** Excalidraw JSON 内容 */
	readonly content: string;
	/** 绘图宽度（可选） */
	readonly width?: number;
	/** 绘图高度（可选） */
	readonly height?: number;
}

/**
 * 保存绘图内容
 *
 * 保存绘图的 Excalidraw 内容，可选地更新尺寸。
 *
 * @param params - 保存参数
 * @returns TaskEither<AppError, void>
 */
export const saveDrawingContent = (
	params: SaveDrawingContentParams,
): TE.TaskEither<AppError, void> => {
	logger.start("[Action] 保存绘图内容...");

	const updates: {
		content: string;
		width?: number;
		height?: number;
	} = {
		content: params.content,
	};

	if (params.width !== undefined) {
		updates.width = params.width;
	}
	if (params.height !== undefined) {
		updates.height = params.height;
	}

	return pipe(
		updateDrawing(params.drawingId, updates),
		TE.map(() => undefined),
		TE.tap(() => {
			logger.success("[Action] 绘图内容保存成功:", params.drawingId);
			return TE.right(undefined);
		}),
	);
};
