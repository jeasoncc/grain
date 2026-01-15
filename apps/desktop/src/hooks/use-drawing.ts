/**
 * @file use-drawing.ts
 * @description Drawing React Hooks - 绘图数据响应式绑定
 *
 * @deprecated 此文件已弃用。Excalidraw 绘图现在作为文件节点存储在文件树中。
 * 请使用以下替代方案：
 * - 创建绘图：使用 createExcalidrawAsync from "@/flows/templated"
 * - 查询绘图：使用 useNodesByType("drawing") from "@/hooks/use-node"
 * - 编辑绘图：点击文件树中的绘图节点，在主编辑器区域打开
 *
 * 此文件保留空导出以保持向后兼容性，避免导入错误。
 *
 * 迁移说明：
 * - 从 dexie-react-hooks 迁移到 TanStack Query
 * - 底层使用 Repository 层访问 SQLite 数据
 *
 * @requirements 3.3
 */

import { useCallback, useMemo, useState } from "react";
import {
	useNode as useNodeQuery,
	useNodesByType,
} from "@/hooks/queries/node.queries";
import { info, warn } from "@/io/log/logger.api";
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
): readonly NodeInterface[] | undefined {
	const { data: nodes, isLoading } = useNodesByType(workspaceId, "drawing");

	return useMemo(() => {
		if (isLoading) return undefined;
		if (!nodes) return [];
		return nodes.slice().sort((a, b) => a.title.localeCompare(b.title));
	}, [nodes, isLoading]);
}

/**
 * @deprecated 使用 useDrawingNodes 替代
 */
export function useDrawingsByWorkspace(
	workspaceId: string | null | undefined,
): readonly NodeInterface[] | undefined {
	return useDrawingNodes(workspaceId);
}

/**
 * @deprecated 使用 useDrawingNodes 替代
 */
export function useDrawingsByProject(
	projectId: string | null | undefined,
): readonly NodeInterface[] | undefined {
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
	const { data: node, isLoading } = useNodeQuery(drawingId);

	return useMemo(() => {
		if (isLoading) return undefined;
		if (node?.type === "drawing") {
			return node;
		}
		return undefined;
	}, [node, isLoading]);
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
): readonly NodeInterface[] | undefined {
	const { data: nodes, isLoading } = useNodesByType(workspaceId, "drawing");

	return useMemo(() => {
		if (isLoading) return undefined;
		if (!nodes) return [];

		const sorted = nodes.slice().sort((a, b) => a.title.localeCompare(b.title));

		if (!query || query.trim() === "") {
			return sorted;
		}

		const lowerQuery = query.toLowerCase();
		return sorted.filter((node) =>
			node.title.toLowerCase().includes(lowerQuery),
		);
	}, [nodes, query, isLoading]);
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
): readonly NodeInterface[] | undefined {
	const { data: nodes, isLoading } = useNodesByType(workspaceId, "drawing");

	return useMemo(() => {
		if (isLoading) return undefined;
		if (!nodes) return [];

		return nodes
			.slice()
			.sort(
				(a, b) =>
					new Date(b.lastEdit).getTime() - new Date(a.lastEdit).getTime(),
			)
			.slice(0, limit);
	}, [nodes, limit, isLoading]);
}

/**
 * 获取所有绘图节点（跨工作区）（实时更新）
 *
 * 注意：当前实现需要指定工作区，跨工作区查询需要额外 API 支持
 *
 * @returns 所有绘图节点数组，加载中返回 undefined
 */
export function useAllDrawings(): readonly NodeInterface[] | undefined {
	// 注意：当前 API 不支持跨工作区查询
	// 如果需要此功能，需要添加对应的 Rust API
	return undefined;
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
	const { data: nodes, isLoading } = useNodesByType(workspaceId, "drawing");

	if (isLoading) return undefined;
	return nodes?.length ?? 0;
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
	const { data: node, isLoading } = useNodeQuery(drawingId);

	if (isLoading) return undefined;
	if (!drawingId) return false;
	return node?.type === "drawing";
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
		info("[Drawing] 选择绘图", { drawingId: drawing.id }, "use-drawing");
	}, []);

	// 清除选择
	const clearSelection = useCallback(() => {
		setSelectedDrawing(null);
		info("[Drawing] 清除绘图选择");
	}, []);

	return {
		drawings: drawings ?? [],
		selectedDrawing,
		selectDrawing,
		clearSelection,
		// createNewDrawing 已移除，请使用 createExcalidrawAsync
		createNewDrawing: async () => {
			warn(
				"[Drawing] createNewDrawing 已弃用，请使用 createExcalidrawAsync",
			);
			return null;
		},
	};
}
