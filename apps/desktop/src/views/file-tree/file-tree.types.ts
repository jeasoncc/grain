/**
 * FileTree Component Types
 * Type definitions for FileTree and FileTreeItem components
 */

import type { TreeNode } from "@/pipes/node";
import type { NodeInterface, NodeType } from "@/types/node";

/**
 * FileTree Props 接口
 *
 * 纯展示组件：所有数据和回调通过 props 传入
 */
export interface FileTreeProps {
	/** 工作区 ID（用于显示空状态） */
	readonly workspaceId: string | null;
	/** 节点数据数组 */
	readonly nodes: NodeInterface[];
	/** 当前选中的节点 ID */
	readonly selectedNodeId: string | null;
	/** 节点选择回调 */
	readonly onSelectNode: (nodeId: string) => void;
	/** 创建文件夹回调 */
	readonly onCreateFolder: (parentId: string | null) => void;
	/** 创建文件回调 */
	readonly onCreateFile: (parentId: string | null, type: NodeType) => void;
	/** 删除节点回调 */
	readonly onDeleteNode: (nodeId: string) => void;
	/** 重命名节点回调 */
	readonly onRenameNode: (nodeId: string, newTitle: string) => void;
	/** 移动节点回调 */
	readonly onMoveNode: (
		nodeId: string,
		newParentId: string | null,
		newIndex: number,
	) => void;
	/** 切换节点折叠状态回调 */
	readonly onToggleCollapsed: (nodeId: string, collapsed: boolean) => void;
	/** 创建日记回调（可选） */
	readonly onCreateDiary?: () => void;
	/** Tree ref for scrolling (可选) */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly treeRef?: React.RefObject<any>;
}

/**
 * TreeData 接口
 * react-arborist 使用的树形数据结构
 */
export interface TreeData {
	readonly id: string;
	readonly name: string;
	readonly type: NodeType;
	readonly collapsed: boolean;
	readonly children?: TreeData[];
}

/**
 * DragState 接口
 * 拖拽状态
 */
export interface DragState {
	readonly draggedId: string;
	readonly targetId: string | null;
	readonly position: "before" | "after" | "inside" | null;
}

/**
 * FileTreeItem Props 接口
 */
export interface FileTreeItemProps {
	readonly node: TreeNode;
	readonly selectedId: string | null;
	readonly renamingId: string | null;
	readonly dragState: DragState;
	readonly onSelect: (nodeId: string) => void;
	readonly onToggle: (nodeId: string, currentCollapsed: boolean) => void;
	readonly onStartRename: (nodeId: string) => void;
	readonly onRename: (nodeId: string, newTitle: string) => void;
	readonly onCancelRename: () => void;
	readonly onDelete: (nodeId: string) => void;
	readonly onCreateFolder: (parentId: string | null) => void;
	readonly onCreateFile: (parentId: string | null, type: NodeType) => void;
	readonly onDragStart: (e: React.DragEvent, nodeId: string) => void;
	readonly onDragOver: (
		e: React.DragEvent,
		nodeId: string,
		nodeType: NodeType,
	) => void;
	readonly onDragEnd: () => void;
	readonly onDrop: (
		e: React.DragEvent,
		targetId: string,
		targetType: NodeType,
	) => void;
}

// Re-export NodeInterface for convenience
export type { NodeInterface } from "@/types/node";
