/**
 * Tag Graph Panel Types - 标签关系图谱面板类型定义
 */

/**
 * Tag Graph 数据接口
 */
export interface TagGraphData {
	nodes: Array<{
		id: string;
		name: string;
		count: number;
	}>;
	edges: Array<{
		source: string;
		target: string;
		weight: number;
	}>;
}

/**
 * TagGraphPanelView Props 接口
 *
 * 纯展示组件：所有数据通过 props 传入
 */
export interface TagGraphPanelViewProps {
	/** 当前工作区 ID */
	readonly workspaceId: string | null;
	/** 标签图谱数据 */
	readonly graphData: TagGraphData | null;
}
