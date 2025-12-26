/**
 * @file use-drawing.ts
 * @description Drawing React Hooks - 绘图数据响应式绑定
 *
 * @deprecated 此文件已弃用。Excalidraw 绘图现在作为文件节点存储在文件树中。
 * 请使用以下替代方案：
 * - 创建绘图：使用 createExcalidrawAsync from "@/actions/templated"
 * - 查询绘图：使用 useNodesByType("drawing") from "@/hooks/use-node"
 * - 编辑绘图：点击文件树中的绘图节点，在主编辑器区域打开
 *
 * 此文件保留空导出以保持向后兼容性，避免导入错误。
 *
 * @requirements 3.3
 */

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useState } from "react";
import { database } from "@/db/database";
import logger from "@/log";
import type { NodeInterface } from "@/types/node";

// ============================================================================
// 新架构：基于文件树的绘图查询
// ============================================================================

/**
 * 获取工作区的所有绘图节点（实时更新）
 *
 * @param workspaceId - 工作区 ID（可为 null/undefined）
 * @returns 绘图节点数组，加载中返回 undefined
 */
export function useDrawingNodes(
	workspaceId: string | null | undefined,
): NodeInterface[] | undefined {
	return useLiveQuery(
		async () => {
			if (!workspaceId) return [];
			const nodes = await database.nodes
				.where("workspace")
				.equals(workspaceId)
				.and((node) => node.type === "drawing")
				.toArray();
			return nodes.sort((a, b) => a.title.localeCompare(b.title));
		},
		[workspaceId],
		undefined,
	);
}

/**
 * @deprecated 使用 useDrawingNodes 替代
 */
export function useDrawingsByWorkspace(
	workspaceId: string | null | undefined,
): NodeInterface[] | undefined {
	return useDrawingNodes(workspaceId);
}

/**
 * @deprecated 使用 useDrawingNodes 替代
 */
export function useDrawingsByProject(
	projectId: string | null | undefined,
): NodeInterface[] | undefined {
	return useDrawingNodes(projectId);
}

/**
 * 获取单个绘图节点（实时更新）
 *
 * @param drawingId - 绘图节点 ID（可为 null/undefined）
 * @returns 绘图节点对象，不存在或加载中返回 undefined
 */
export function useDrawing(
	drawingId: string | null | undefined,
): NodeInterface | undefined {
	return useLiveQuery(
		async () => {
			if (!drawingId) return undefined;
			const node = await database.nodes.get(drawingId);
			if (node?.type === "drawing") {
				return node;
			}
			return undefined;
		},
		[drawingId],
		undefined,
	);
}

// ============================================================================
// 搜索和过滤 Hooks
// ============================================================================

/**
 * 搜索绘图节点（实时更新）
 *
 * @param workspaceId - 工作区 ID
 * @param query - 搜索关键词
 * @returns 匹配的绘图节点数组
 */
export function useDrawingSearch(
	workspaceId: string | null | undefined,
	query: string | null | undefined,
): NodeInterface[] | undefined {
	return useLiveQuery(
		async () => {
			if (!workspaceId) return [];

			const nodes = await database.nodes
				.where("workspace")
				.equals(workspaceId)
				.and((node) => node.type === "drawing")
				.toArray();

			if (!query || query.trim() === "") {
				return nodes.sort((a, b) => a.title.localeCompare(b.title));
			}

			const lowerQuery = query.toLowerCase();
			return nodes
				.filter((node) => node.title.toLowerCase().includes(lowerQuery))
				.sort((a, b) => a.title.localeCompare(b.title));
		},
		[workspaceId, query],
		undefined,
	);
}

/**
 * 获取最近更新的绘图节点（实时更新）
 *
 * @param workspaceId - 工作区 ID
 * @param limit - 返回的最大数量（默认：10）
 * @returns 最近更新的绘图节点数组
 */
export function useRecentDrawings(
	workspaceId: string | null | undefined,
	limit = 10,
): NodeInterface[] | undefined {
	return useLiveQuery(
		async () => {
			if (!workspaceId) return [];

			const nodes = await database.nodes
				.where("workspace")
				.equals(workspaceId)
				.and((node) => node.type === "drawing")
				.toArray();

			return nodes
				.sort(
					(a, b) =>
						new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
				)
				.slice(0, limit);
		},
		[workspaceId, limit],
		undefined,
	);
}

/**
 * 获取所有绘图节点（跨工作区）（实时更新）
 *
 * @returns 所有绘图节点数组，加载中返回 undefined
 */
export function useAllDrawings(): NodeInterface[] | undefined {
	return useLiveQuery(
		async () => {
			return database.nodes.where("type").equals("drawing").toArray();
		},
		[],
		undefined,
	);
}

// ============================================================================
// 统计和检查 Hooks
// ============================================================================

/**
 * 获取工作区绘图数量（实时更新）
 *
 * @param workspaceId - 工作区 ID
 * @returns 绘图数量，加载中返回 undefined
 */
export function useDrawingCount(
	workspaceId: string | null | undefined,
): number | undefined {
	return useLiveQuery(
		async () => {
			if (!workspaceId) return 0;
			return database.nodes
				.where("workspace")
				.equals(workspaceId)
				.and((node) => node.type === "drawing")
				.count();
		},
		[workspaceId],
		undefined,
	);
}

/**
 * 检查绘图节点是否存在（实时更新）
 *
 * @param drawingId - 绘图节点 ID
 * @returns 存在返回 true，不存在返回 false，加载中返回 undefined
 */
export function useDrawingExists(
	drawingId: string | null | undefined,
): boolean | undefined {
	return useLiveQuery(
		async () => {
			if (!drawingId) return false;
			const node = await database.nodes.get(drawingId);
			return node?.type === "drawing";
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
 * @deprecated 此 hook 已弃用。绘图现在通过文件树管理。
 * 请使用 createExcalidrawAsync 创建绘图，通过文件树选择绘图。
 *
 * @param workspaceId - 工作区 ID（可为 null）
 * @returns 绘图列表、选中绘图、操作函数
 */
export function useDrawingWorkspace(workspaceId: string | null) {
	const [selectedDrawing, setSelectedDrawing] = useState<NodeInterface | null>(
		null,
	);
	const drawings = useDrawingNodes(workspaceId);

	// 选择绘图
	const selectDrawing = useCallback((drawing: NodeInterface) => {
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
		selectDrawing,
		clearSelection,
		// createNewDrawing 已移除，请使用 createExcalidrawAsync
		createNewDrawing: async () => {
			logger.warn(
				"[Drawing] createNewDrawing 已弃用，请使用 createExcalidrawAsync",
			);
			return null;
		},
	};
}
