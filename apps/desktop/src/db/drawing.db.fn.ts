/**
 * @file drawing.db.fn.ts
 * @description Drawing 数据库操作函数
 *
 * 功能说明：
 * - 提供绘图的 CRUD 操作
 * - 提供项目级查询（按项目获取、搜索等）
 * - 使用 TaskEither 返回类型进行错误处理
 * - 所有操作都有日志记录
 *
 * @requirements 3.1, 3.2, 3.3
 */

import dayjs from "dayjs";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { type AppError, dbError, notFoundError } from "@/lib/error.types";
import logger from "@/log";
import { DrawingBuilder } from "@/types/drawing/drawing.builder";
import type {
	DrawingInterface,
	DrawingUpdateInput,
} from "@/types/drawing/drawing.interface";
import { database } from "./database";

// ============================================================================
// 基础 CRUD 操作
// ============================================================================

/**
 * 添加新绘图
 *
 * @param projectId - 项目/工作区 ID
 * @param name - 绘图名称
 * @param options - 可选的绘图属性
 * @returns TaskEither<AppError, DrawingInterface>
 */
export const addDrawing = (
	projectId: string,
	name: string,
	options: {
		content?: string;
		width?: number;
		height?: number;
	} = {},
): TE.TaskEither<AppError, DrawingInterface> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 添加绘图:", { projectId, name });

			const builder = new DrawingBuilder().project(projectId).name(name);

			if (options.content !== undefined) {
				builder.content(options.content);
			}
			if (options.width !== undefined) {
				builder.width(options.width);
			}
			if (options.height !== undefined) {
				builder.height(options.height);
			}

			const drawing = builder.build();
			await database.drawings.add(drawing);

			logger.success("[DB] 绘图添加成功:", drawing.id);
			return drawing;
		},
		(error): AppError => {
			logger.error("[DB] 添加绘图失败:", error);
			return dbError(`添加绘图失败: ${error}`);
		},
	);

/**
 * 更新绘图
 *
 * @param id - 绘图 ID
 * @param updates - 更新的字段
 * @returns TaskEither<AppError, number> - 更新的记录数（0 或 1）
 */
export const updateDrawing = (
	id: string,
	updates: DrawingUpdateInput,
): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 更新绘图:", { id, updates });

			const count = await database.drawings.update(id, {
				...updates,
				updatedAt: dayjs().toISOString(),
			});

			if (count > 0) {
				logger.success("[DB] 绘图更新成功:", id);
			} else {
				logger.warn("[DB] 绘图未找到:", id);
			}

			return count;
		},
		(error): AppError => {
			logger.error("[DB] 更新绘图失败:", error);
			return dbError(`更新绘图失败: ${error}`);
		},
	);

/**
 * 删除绘图
 *
 * @param id - 绘图 ID
 * @returns TaskEither<AppError, void>
 */
export const deleteDrawing = (id: string): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 删除绘图:", id);
			await database.drawings.delete(id);
			logger.success("[DB] 绘图删除成功:", id);
		},
		(error): AppError => {
			logger.error("[DB] 删除绘图失败:", error);
			return dbError(`删除绘图失败: ${error}`);
		},
	);

/**
 * 删除项目的所有绘图
 *
 * @param projectId - 项目/工作区 ID
 * @returns TaskEither<AppError, number> - 删除的记录数
 */
export const deleteDrawingsByProject = (
	projectId: string,
): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 删除项目绘图:", projectId);
			const count = await database.drawings
				.where("project")
				.equals(projectId)
				.delete();
			logger.success("[DB] 项目绘图删除成功:", { projectId, count });
			return count;
		},
		(error): AppError => {
			logger.error("[DB] 删除项目绘图失败:", error);
			return dbError(`删除项目绘图失败: ${error}`);
		},
	);

// ============================================================================
// 查询操作
// ============================================================================

/**
 * 根据 ID 获取绘图
 *
 * @param id - 绘图 ID
 * @returns TaskEither<AppError, DrawingInterface | undefined>
 */
export const getDrawingById = (
	id: string,
): TE.TaskEither<AppError, DrawingInterface | undefined> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取绘图:", id);
			return database.drawings.get(id);
		},
		(error): AppError => {
			logger.error("[DB] 获取绘图失败:", error);
			return dbError(`获取绘图失败: ${error}`);
		},
	);

/**
 * 根据 ID 获取绘图（必须存在）
 *
 * @param id - 绘图 ID
 * @returns TaskEither<AppError, DrawingInterface>
 */
export const getDrawingByIdOrFail = (
	id: string,
): TE.TaskEither<AppError, DrawingInterface> =>
	pipe(
		getDrawingById(id),
		TE.chain((drawing) =>
			drawing
				? TE.right(drawing)
				: TE.left(notFoundError(`绘图不存在: ${id}`, id)),
		),
	);

/**
 * 获取所有绘图
 *
 * @returns TaskEither<AppError, DrawingInterface[]>
 */
export const getAllDrawings = (): TE.TaskEither<AppError, DrawingInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取所有绘图");
			return database.drawings.toArray();
		},
		(error): AppError => {
			logger.error("[DB] 获取所有绘图失败:", error);
			return dbError(`获取所有绘图失败: ${error}`);
		},
	);

/**
 * 获取项目的所有绘图
 *
 * @param projectId - 项目/工作区 ID
 * @returns TaskEither<AppError, DrawingInterface[]> - 按名称排序的绘图数组
 */
export const getDrawingsByProject = (
	projectId: string,
): TE.TaskEither<AppError, DrawingInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取项目绘图:", projectId);
			const drawings = await database.drawings
				.where("project")
				.equals(projectId)
				.toArray();
			return drawings.sort((a, b) => a.name.localeCompare(b.name));
		},
		(error): AppError => {
			logger.error("[DB] 获取项目绘图失败:", error);
			return dbError(`获取项目绘图失败: ${error}`);
		},
	);

/**
 * 搜索项目中的绘图
 *
 * @param projectId - 项目/工作区 ID
 * @param query - 搜索关键词
 * @returns TaskEither<AppError, DrawingInterface[]>
 */
export const searchDrawings = (
	projectId: string,
	query: string,
): TE.TaskEither<AppError, DrawingInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 搜索绘图:", { projectId, query });
			const lowerQuery = query.toLowerCase();
			const drawings = await database.drawings
				.where("project")
				.equals(projectId)
				.toArray();

			return drawings.filter((drawing) =>
				drawing.name.toLowerCase().includes(lowerQuery),
			);
		},
		(error): AppError => {
			logger.error("[DB] 搜索绘图失败:", error);
			return dbError(`搜索绘图失败: ${error}`);
		},
	);

/**
 * 获取最近更新的绘图
 *
 * @param projectId - 项目/工作区 ID
 * @param limit - 返回的最大数量
 * @returns TaskEither<AppError, DrawingInterface[]>
 */
export const getRecentDrawings = (
	projectId: string,
	limit = 10,
): TE.TaskEither<AppError, DrawingInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取最近绘图:", { projectId, limit });
			const drawings = await database.drawings
				.where("project")
				.equals(projectId)
				.toArray();

			return drawings
				.sort(
					(a, b) =>
						new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
				)
				.slice(0, limit);
		},
		(error): AppError => {
			logger.error("[DB] 获取最近绘图失败:", error);
			return dbError(`获取最近绘图失败: ${error}`);
		},
	);

// ============================================================================
// 辅助操作
// ============================================================================

/**
 * 检查绘图是否存在
 *
 * @param id - 绘图 ID
 * @returns TaskEither<AppError, boolean>
 */
export const drawingExists = (id: string): TE.TaskEither<AppError, boolean> =>
	TE.tryCatch(
		async () => {
			const count = await database.drawings.where("id").equals(id).count();
			return count > 0;
		},
		(error): AppError => {
			logger.error("[DB] 检查绘图存在失败:", error);
			return dbError(`检查绘图存在失败: ${error}`);
		},
	);

/**
 * 检查项目中是否存在同名绘图
 *
 * @param projectId - 项目/工作区 ID
 * @param name - 绘图名称
 * @returns TaskEither<AppError, boolean>
 */
export const drawingExistsByName = (
	projectId: string,
	name: string,
): TE.TaskEither<AppError, boolean> =>
	TE.tryCatch(
		async () => {
			const drawings = await database.drawings
				.where("project")
				.equals(projectId)
				.toArray();

			return drawings.some(
				(drawing) => drawing.name.toLowerCase() === name.toLowerCase(),
			);
		},
		(error): AppError => {
			logger.error("[DB] 检查绘图名称存在失败:", error);
			return dbError(`检查绘图名称存在失败: ${error}`);
		},
	);

/**
 * 统计项目的绘图数量
 *
 * @param projectId - 项目/工作区 ID
 * @returns TaskEither<AppError, number>
 */
export const countDrawingsByProject = (
	projectId: string,
): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			return database.drawings.where("project").equals(projectId).count();
		},
		(error): AppError => {
			logger.error("[DB] 统计绘图数量失败:", error);
			return dbError(`统计绘图数量失败: ${error}`);
		},
	);

/**
 * 统计所有绘图数量
 *
 * @returns TaskEither<AppError, number>
 */
export const countAllDrawings = (): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			return database.drawings.count();
		},
		(error): AppError => {
			logger.error("[DB] 统计所有绘图数量失败:", error);
			return dbError(`统计所有绘图数量失败: ${error}`);
		},
	);

// ============================================================================
// 便捷更新操作
// ============================================================================

/**
 * 更新绘图名称
 *
 * @param id - 绘图 ID
 * @param name - 新名称
 * @returns TaskEither<AppError, void>
 */
export const updateDrawingName = (
	id: string,
	name: string,
): TE.TaskEither<AppError, void> =>
	pipe(
		updateDrawing(id, { name }),
		TE.map(() => {
			logger.success("[DB] 绘图名称更新成功:", { id, name });
			return undefined;
		}),
	);

/**
 * 更新绘图内容
 *
 * @param id - 绘图 ID
 * @param content - 新的 Excalidraw JSON 内容
 * @returns TaskEither<AppError, void>
 */
export const updateDrawingContent = (
	id: string,
	content: string,
): TE.TaskEither<AppError, void> =>
	pipe(
		updateDrawing(id, { content }),
		TE.map(() => {
			logger.debug("[DB] 绘图内容更新成功:", id);
			return undefined;
		}),
	);

/**
 * 更新绘图尺寸
 *
 * @param id - 绘图 ID
 * @param width - 新宽度
 * @param height - 新高度
 * @returns TaskEither<AppError, void>
 */
export const updateDrawingDimensions = (
	id: string,
	width: number,
	height: number,
): TE.TaskEither<AppError, void> =>
	pipe(
		updateDrawing(id, { width, height }),
		TE.map(() => {
			logger.success("[DB] 绘图尺寸更新成功:", { id, width, height });
			return undefined;
		}),
	);

// ============================================================================
// 复制操作
// ============================================================================

/**
 * 复制绘图
 *
 * @param id - 要复制的绘图 ID
 * @param newName - 可选的新名称
 * @returns TaskEither<AppError, DrawingInterface>
 */
export const duplicateDrawing = (
	id: string,
	newName?: string,
): TE.TaskEither<AppError, DrawingInterface> =>
	pipe(
		getDrawingByIdOrFail(id),
		TE.chain((original) => {
			const duplicateName = newName || `${original.name} (副本)`;
			return addDrawing(original.project, duplicateName, {
				content: original.content,
				width: original.width,
				height: original.height,
			});
		}),
	);

/**
 * 保存绘图（直接保存完整绘图对象）
 *
 * @param drawing - 绘图对象
 * @returns TaskEither<AppError, DrawingInterface>
 */
export const saveDrawing = (
	drawing: DrawingInterface,
): TE.TaskEither<AppError, DrawingInterface> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 保存绘图:", drawing.id);
			await database.drawings.put(drawing);
			logger.success("[DB] 绘图保存成功:", drawing.id);
			return drawing;
		},
		(error): AppError => {
			logger.error("[DB] 保存绘图失败:", error);
			return dbError(`保存绘图失败: ${error}`);
		},
	);

// ============================================================================
// 清理操作
// ============================================================================

/**
 * 清理所有绘图数据中的异常值
 * 防止 "Canvas exceeds max size" 错误
 *
 * @returns Promise<void>
 */
export const cleanupAllDrawings = async (): Promise<void> => {
	try {
		logger.info("[DB] 开始清理绘图数据...");
		const drawings = await database.drawings.toArray();

		const MAX_COORD = 50000;
		let cleanedCount = 0;

		for (const drawing of drawings) {
			if (!drawing.content) continue;

			try {
				const data = JSON.parse(drawing.content);
				if (!data.elements || !Array.isArray(data.elements)) continue;

				let needsUpdate = false;

				// 清理异常坐标值
				for (const element of data.elements) {
					if (
						typeof element.x === "number" &&
						Math.abs(element.x) > MAX_COORD
					) {
						element.x = 0;
						needsUpdate = true;
					}
					if (
						typeof element.y === "number" &&
						Math.abs(element.y) > MAX_COORD
					) {
						element.y = 0;
						needsUpdate = true;
					}
					if (
						typeof element.width === "number" &&
						Math.abs(element.width) > MAX_COORD
					) {
						element.width = 100;
						needsUpdate = true;
					}
					if (
						typeof element.height === "number" &&
						Math.abs(element.height) > MAX_COORD
					) {
						element.height = 100;
						needsUpdate = true;
					}
				}

				// 清理 appState 中的异常值
				if (data.appState) {
					if (
						typeof data.appState.scrollX === "number" &&
						Math.abs(data.appState.scrollX) > MAX_COORD
					) {
						data.appState.scrollX = 0;
						needsUpdate = true;
					}
					if (
						typeof data.appState.scrollY === "number" &&
						Math.abs(data.appState.scrollY) > MAX_COORD
					) {
						data.appState.scrollY = 0;
						needsUpdate = true;
					}
				}

				if (needsUpdate) {
					await database.drawings.update(drawing.id, {
						content: JSON.stringify(data),
					});
					cleanedCount++;
				}
			} catch {
				// 忽略 JSON 解析错误
			}
		}

		if (cleanedCount > 0) {
			logger.success(`[DB] 清理了 ${cleanedCount} 个绘图的异常数据`);
		} else {
			logger.debug("[DB] 绘图数据无需清理");
		}
	} catch (error) {
		logger.error("[DB] 清理绘图数据失败:", error);
	}
};
