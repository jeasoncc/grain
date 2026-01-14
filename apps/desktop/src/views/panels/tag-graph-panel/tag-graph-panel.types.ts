/**
 * Tag Graph Panel Types - 标签关系图谱面板类型定义
 */

/**
 * Tag Graph 数据接口
 */
export interface TagGraphData {
	readonly nodes: ReadonlyArray<{
		readonly id: string;
		readonly name: string;
		readonly count: number;
	}>;
	readonly edges: ReadonlyArray<{
		readonly source: string;
		readonly target: string;
		readonly weight: number;
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
