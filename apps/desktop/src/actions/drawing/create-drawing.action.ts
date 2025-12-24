/**
 * @file create-drawing.action.ts
 * @description 创建绘图 Action
 *
 * 功能说明：
 * - 创建新绘图
 * - 支持自定义名称、尺寸
 * - 使用 Zod Schema 校验参数
 * - 使用 TaskEither 进行错误处理
 *
 * @requirements 7.1, 7.4
 */

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { z } from "zod";
import { addDrawing } from "@/db/drawing.db.fn";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";
import type { DrawingInterface } from "@/types/drawing";

// ==============================
// Schema
// ==============================

/**
 * 创建绘图参数 Schema
 */
const createDrawingParamsSchema = z.object({
	workspaceId: z.string().uuid({ message: "工作区 ID 必须是有效的 UUID" }),
	name: z.string().min(1).max(200).optional(),
	width: z.number().positive("宽度必须为正数").optional(),
	height: z.number().positive("高度必须为正数").optional(),
	content: z.string().optional(),
});

export type CreateDrawingParams = z.infer<typeof createDrawingParamsSchema>;

// ==============================
// Constants
// ==============================

const DEFAULT_DRAWING_WIDTH = 800;
const DEFAULT_DRAWING_HEIGHT = 600;
const DEFAULT_DRAWING_CONTENT = JSON.stringify({
	elements: [],
	appState: {},
	files: {},
});

// ==============================
// Actions
// ==============================

/**
 * 创建新绘图
 *
 * 创建一个新的绘图，支持自定义名称和尺寸。
 * 参数会通过 Zod Schema 进行校验。
 *
 * @param params - 创建绘图参数
 * @returns TaskEither<AppError, DrawingInterface>
 */
export const createDrawing = (
	params: CreateDrawingParams,
): TE.TaskEither<AppError, DrawingInterface> => {
	logger.start("[Action] 创建绘图...");

	return pipe(
		// 1. 校验参数
		createDrawingParamsSchema.safeParse(params),
		(result) =>
			result.success
				? E.right(result.data)
				: E.left({
						type: "VALIDATION_ERROR" as const,
						message: `参数校验失败: ${result.error.issues[0]?.message || "未知错误"}`,
					}),
		TE.fromEither,
		// 2. 准备绘图数据
		TE.map((validParams) => ({
			name: validParams.name || `Drawing ${Date.now()}`,
			width: validParams.width || DEFAULT_DRAWING_WIDTH,
			height: validParams.height || DEFAULT_DRAWING_HEIGHT,
			content: validParams.content || DEFAULT_DRAWING_CONTENT,
			workspaceId: validParams.workspaceId,
		})),
		// 3. 创建绘图
		TE.chain((data) =>
			addDrawing(data.workspaceId, data.name, {
				width: data.width,
				height: data.height,
				content: data.content,
			}),
		),
		// 4. 记录成功日志
		TE.tap((drawing) => {
			logger.success("[Action] 绘图创建成功:", drawing.id);
			return TE.right(undefined);
		}),
		// 5. 记录错误日志
		TE.mapLeft((error) => {
			logger.error("[Action] 绘图创建失败:", error);
			return error;
		}),
	);
};

/**
 * 创建新绘图（异步版本）
 *
 * 用于在组件中直接调用，返回 Promise。
 *
 * @param params - 创建绘图参数
 * @returns Promise<DrawingInterface>
 * @throws Error 如果创建失败
 */
export async function createDrawingAsync(
	params: CreateDrawingParams,
): Promise<DrawingInterface> {
	const result = await createDrawing(params)();

	if (E.isLeft(result)) {
		throw new Error(`创建绘图失败: ${result.left.message}`);
	}

	return result.right;
}
