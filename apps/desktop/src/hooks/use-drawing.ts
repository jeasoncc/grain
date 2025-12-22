/**
 * @file use-drawing.ts
 * @description Drawing React Hooks - 绘图数据响应式绑定
 *
 * 提供 React hooks 用于访问绘图数据，支持实时更新。
 * 使用 dexie-react-hooks 实现响应式数据订阅。
 *
 * 整合自：
 * - db/models/drawing/drawing.hooks.ts
 * - hooks/use-drawing-workspace.ts
 *
 * @requirements 3.3
 */

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { database } from "@/db/database";
import { addDrawing } from "@/db/drawing.db.fn";
import logger from "@/log";
import type { DrawingInterface } from "@/types/drawing";

// ============================================================================
// 基础查询 Hooks
// ============================================================================

/**
 * 获取项目/工作区的所有绘图（实时更新）
 *
 * 返回按名称排序的绘图列表。
 *
 * @param projectId - 项目/工作区 ID（可为 null/undefined）
 * @returns 绘图数组，加载中返回 undefined
 *
 * @example
 * ```tsx
 * function DrawingList({ projectId }: { projectId: string }) {
 *   const drawings = useDrawingsByProject(projectId);
 *
 *   if (drawings === undefined) {
 *     return <Loading />;
 *   }
 *
 *   return (
 *     <ul>
 *       {drawings.map(drawing => (
 *         <li key={drawing.id}>{drawing.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useDrawingsByProject(
	projectId: string | null | undefined,
): DrawingInterface[] | undefined {
	return useLiveQuery(
		async () => {
			if (!projectId) return [];
			const drawings = await database.drawings
				.where("project")
				.equals(projectId)
				.toArray();
			return drawings.sort((a, b) => a.name.localeCompare(b.name));
		},
		[projectId],
		undefined,
	);
}

/**
 * 获取工作区的所有绘图（实时更新）
 *
 * useDrawingsByProject 的别名，用于语义清晰。
 *
 * @param workspaceId - 工作区 ID（可为 null/undefined）
 * @returns 绘图数组，加载中返回 undefined
 */
export function useDrawingsByWorkspace(
	workspaceId: string | null | undefined,
): DrawingInterface[] | undefined {
	return useDrawingsByProject(workspaceId);
}

/**
 * 获取单个绘图（实时更新）
 *
 * @param drawingId - 绘图 ID（可为 null/undefined）
 * @returns 绘图对象，不存在或加载中返回 undefined
 *
 * @example
 * ```tsx
 * function DrawingDetail({ drawingId }: { drawingId: string }) {
 *   const drawing = useDrawing(drawingId);
 *
 *   if (!drawing) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   return <h1>{drawing.name}</h1>;
 * }
 * ```
 */
export function useDrawing(
	drawingId: string | null | undefined,
): DrawingInterface | undefined {
	return useLiveQuery(
		async () => {
			if (!drawingId) return undefined;
			return database.drawings.get(drawingId);
		},
		[drawingId],
		undefined,
	);
}

// ============================================================================
// 搜索和过滤 Hooks
// ============================================================================

/**
 * 搜索绘图（实时更新）
 *
 * 按名称搜索绘图，返回按名称排序的结果。
 *
 * @param projectId - 项目/工作区 ID
 * @param query - 搜索关键词
 * @returns 匹配的绘图数组
 */
export function useDrawingSearch(
	projectId: string | null | undefined,
	query: string | null | undefined,
): DrawingInterface[] | undefined {
	return useLiveQuery(
		async () => {
			if (!projectId) return [];

			const drawings = await database.drawings
				.where("project")
				.equals(projectId)
				.toArray();

			if (!query || query.trim() === "") {
				return drawings.sort((a, b) => a.name.localeCompare(b.name));
			}

			const lowerQuery = query.toLowerCase();
			return drawings
				.filter((drawing) => drawing.name.toLowerCase().includes(lowerQuery))
				.sort((a, b) => a.name.localeCompare(b.name));
		},
		[projectId, query],
		undefined,
	);
}

/**
 * 获取最近更新的绘图（实时更新）
 *
 * @param projectId - 项目/工作区 ID
 * @param limit - 返回的最大数量（默认：10）
 * @returns 最近更新的绘图数组
 */
export function useRecentDrawings(
	projectId: string | null | undefined,
	limit = 10,
): DrawingInterface[] | undefined {
	return useLiveQuery(
		async () => {
			if (!projectId) return [];

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
		[projectId, limit],
		undefined,
	);
}

/**
 * 获取所有绘图（跨项目）（实时更新）
 *
 * @returns 所有绘图数组，加载中返回 undefined
 */
export function useAllDrawings(): DrawingInterface[] | undefined {
	return useLiveQuery(
		async () => {
			return database.drawings.toArray();
		},
		[],
		undefined,
	);
}

// ============================================================================
// 统计和检查 Hooks
// ============================================================================

/**
 * 获取项目绘图数量（实时更新）
 *
 * @param projectId - 项目/工作区 ID
 * @returns 绘图数量，加载中返回 undefined
 */
export function useDrawingCount(
	projectId: string | null | undefined,
): number | undefined {
	return useLiveQuery(
		async () => {
			if (!projectId) return 0;
			return database.drawings.where("project").equals(projectId).count();
		},
		[projectId],
		undefined,
	);
}

/**
 * 检查绘图是否存在（实时更新）
 *
 * @param drawingId - 绘图 ID
 * @returns 存在返回 true，不存在返回 false，加载中返回 undefined
 */
export function useDrawingExists(
	drawingId: string | null | undefined,
): boolean | undefined {
	return useLiveQuery(
		async () => {
			if (!drawingId) return false;
			const count = await database.drawings
				.where("id")
				.equals(drawingId)
				.count();
			return count > 0;
		},
		[drawingId],
		undefined,
	);
}

// ============================================================================
// 工作区绘图管理 Hook
// ============================================================================

/**
 * 绘图工作区管理 Hook
 *
 * 提供绘图的选择、创建等工作区级别的操作。
 *
 * @param workspaceId - 工作区 ID（可为 null）
 * @returns 绘图列表、选中绘图、操作函数
 *
 * @example
 * ```tsx
 * function DrawingPanel({ workspaceId }: { workspaceId: string }) {
 *   const {
 *     drawings,
 *     selectedDrawing,
 *     createNewDrawing,
 *     selectDrawing,
 *     clearSelection,
 *   } = useDrawingWorkspace(workspaceId);
 *
 *   return (
 *     <div>
 *       <button onClick={() => createNewDrawing()}>新建绘图</button>
 *       <DrawingList
 *         drawings={drawings}
 *         selected={selectedDrawing}
 *         onSelect={selectDrawing}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useDrawingWorkspace(workspaceId: string | null) {
	const [selectedDrawing, setSelectedDrawing] =
		useState<DrawingInterface | null>(null);
	const drawings = useDrawingsByWorkspace(workspaceId);

	// 创建新绘图
	const createNewDrawing = useCallback(
		async (name?: string) => {
			if (!workspaceId) {
				toast.error("未选择工作区");
				return null;
			}

			try {
				const drawingName = name || `绘图 ${(drawings?.length ?? 0) + 1}`;
				const result = await addDrawing(workspaceId, drawingName, {
					width: 800,
					height: 600,
					content: JSON.stringify({ elements: [], appState: {}, files: {} }),
				})();

				if (result._tag === "Right") {
					const newDrawing = result.right;
					setSelectedDrawing(newDrawing);
					toast.success("绘图创建成功");
					logger.success("[Drawing] 创建绘图成功:", newDrawing.id);
					return newDrawing;
				}

				logger.error("[Drawing] 创建绘图失败:", result.left);
				toast.error("创建绘图失败");
				return null;
			} catch (error) {
				logger.error("[Drawing] 创建绘图异常:", error);
				toast.error("创建绘图失败");
				return null;
			}
		},
		[workspaceId, drawings?.length],
	);

	// 选择绘图
	const selectDrawing = useCallback((drawing: DrawingInterface) => {
		setSelectedDrawing(drawing);
		logger.info("[Drawing] 选择绘图:", drawing.id);
	}, []);

	// 清除选择
	const clearSelection = useCallback(() => {
		setSelectedDrawing(null);
		logger.info("[Drawing] 清除绘图选择");
	}, []);

	return {
		drawings: drawings ?? [],
		selectedDrawing,
		createNewDrawing,
		selectDrawing,
		clearSelection,
	};
}
