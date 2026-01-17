/**
 * @file tree-node.view.fn.tsx
 * @description TreeNode 组件 - 文件树节点（极致纯粹声明式）
 *
 * 职责：纯 UI 渲染，像 HTML 一样
 * 所有逻辑在 use-tree-node.ts hook 中
 *
 * 依赖：hooks/, views/, types/
 */

import { ChevronDown, ChevronRight } from "lucide-react"
import type { NodeRendererProps } from "react-arborist"
import { useTreeNode } from "@/hooks/use-tree-node"
import type { NodeType } from "@/types/node"
import { Input } from "@/views/ui/input"
import type { TreeData } from "./file-tree.types"
import { TreeNodeDropdown } from "./tree-node-dropdown.view.fn"
import { TreeNodeIcon } from "./tree-node-icon.view.fn"

export interface TreeNodeProps extends NodeRendererProps<TreeData> {
	readonly onDelete: (nodeId: string) => void
	readonly onCreateFolder: (parentId: string | null) => void
	readonly onCreateFile: (parentId: string | null, type: NodeType) => void
	readonly folderColor?: string
	readonly hasSelection: boolean
}

/**
 * TreeNode - 文件树节点组件（极致纯粹声明式）
 *
 * 数据流：
 *   props → useTreeNode hook → 渲染
 *
 * 特性：
 * - 零逻辑，纯 JSX
 * - 所有状态和处理器来自 hook
 * - 像 HTML 一样清晰
 */
export function TreeNode(props: TreeNodeProps) {
	const { node, style, dragHandle, onDelete, onCreateFolder, onCreateFile, folderColor, hasSelection } = props

	const {
		data,
		isFolder,
		isEditing,
		isOpen,
		isSelected,
		childrenCount,
		containerClassName,
		titleClassName,
		handlers,
	} = useTreeNode({
		node,
		onDelete,
		onCreateFolder,
		onCreateFile,
		folderColor,
		hasSelection,
	})

	return (
		<div
			style={style}
			ref={dragHandle}
			role="treeitem"
			tabIndex={0}
			aria-selected={isSelected}
			aria-expanded={isFolder ? isOpen : undefined}
			data-testid="file-tree-item"
			data-node-id={data.id}
			data-title={data.name}
			data-type={data.type}
			className={containerClassName}
			onClick={handlers.onClick}
			onKeyDown={handlers.onKeyDown}
			onDoubleClick={handlers.onDoubleClick}
		>
			{isFolder ? (
				<button
					type="button"
					onClick={handlers.onChevronClick}
					className="p-0.5 hover:bg-foreground/10 rounded-sm shrink-0 -ml-1"
				>
					{isOpen ? (
						<ChevronDown className="size-3.5 opacity-70" />
					) : (
						<ChevronRight className="size-3.5 opacity-70" />
					)}
				</button>
			) : (
				<span className="w-3.5 -ml-1" />
			)}

			<TreeNodeIcon
				type={data.type}
				isOpen={isOpen}
				isSelected={isSelected}
				hasSelection={hasSelection}
				folderColor={folderColor}
			/>

			{isEditing ? (
				<Input
					autoFocus
					defaultValue={data.name}
					className="h-6 text-sm px-1 py-0 flex-1 min-w-0"
					onBlur={handlers.onInputBlur}
					onKeyDown={handlers.onInputKeyDown}
					onClick={handlers.onInputClick}
				/>
			) : (
				<span className={titleClassName} title={data.name}>
					{data.name}
				</span>
			)}

			{isFolder && childrenCount > 0 && !isEditing && (
				<span className="text-xs opacity-50 group-hover:opacity-100 mr-1">{childrenCount}</span>
			)}

			{!isEditing && (
				<TreeNodeDropdown
					nodeId={data.id}
					isFolder={isFolder}
					onEdit={handlers.onEdit}
					onDelete={onDelete}
					onCreateFolder={onCreateFolder}
					onCreateFile={onCreateFile}
				/>
			)}
		</div>
	)
}
