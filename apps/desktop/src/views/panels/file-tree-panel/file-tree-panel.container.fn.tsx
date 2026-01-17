/**
 * FileTreePanel - 文件树面板容器组件（纯声明式）
 *
 * 数据流：
 *   props → useFileTreePanel hook → FileTree
 *
 * 职责：
 * - 纯 UI 组合
 * - 所有逻辑在 use-file-tree-panel.ts hook 中
 *
 * @see .kiro/steering/architecture.md - views/ 层职责
 */

import { memo } from "react"
import { useFileTreePanel } from "@/hooks/use-file-tree-panel"
import { FileTree } from "@/views/file-tree"
import type { FileTreePanelContainerProps } from "./file-tree-panel.types"

/**
 * FileTreePanelContainer - 文件树面板（极致纯粹声明式）
 *
 * 特性：
 * - 零逻辑，纯组合
 * - 所有状态和处理器来自 hook
 * - 像搭积木一样清晰
 */
export const FileTreePanelContainer = memo(({ workspaceId }: FileTreePanelContainerProps) => {
	const { workspaceId: resolvedWorkspaceId, nodes, selectedNodeId, treeRef, handlers } = useFileTreePanel({
		workspaceId: workspaceId ?? null,
	})

	return (
		<FileTree
			workspaceId={resolvedWorkspaceId}
			nodes={nodes}
			selectedNodeId={selectedNodeId}
			onSelectNode={handlers.onSelectNode}
			onCreateFolder={handlers.onCreateFolder}
			onCreateFile={handlers.onCreateFile}
			onDeleteNode={handlers.onDeleteNode}
			onRenameNode={handlers.onRenameNode}
			onMoveNode={handlers.onMoveNode}
			onToggleCollapsed={handlers.onToggleCollapsed}
			onCreateDiary={handlers.onCreateDiary}
			treeRef={treeRef}
		/>
	)
})

FileTreePanelContainer.displayName = "FileTreePanelContainer"
