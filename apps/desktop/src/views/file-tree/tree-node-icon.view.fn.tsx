/**
 * @file tree-node-icon.view.fn.tsx
 * @description 树节点图标组件
 *
 * 职责：根据节点类型渲染对应图标
 * 依赖规则：views/ 只能依赖 hooks/, types/
 */

import { useIconTheme } from "@/hooks/use-icon-theme"
import { cn } from "@/utils/cn.util"
import type { TreeData } from "./file-tree.types"

// ============================================================================
// 类型定义
// ============================================================================

export interface TreeNodeIconProps {
	readonly type: TreeData["type"]
	readonly isOpen: boolean
	readonly isSelected: boolean
	readonly hasSelection: boolean
	readonly folderColor?: string
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 树节点图标组件
 */
export function TreeNodeIcon({
	type,
	isOpen,
	isSelected,
	hasSelection,
	folderColor,
}: TreeNodeIconProps) {
	const iconTheme = useIconTheme()

	const baseClassName = cn(
		"size-4 shrink-0 transition-opacity duration-200 group-hover/panel:opacity-100",
		!hasSelection || isSelected ? "opacity-100" : "opacity-40",
		isSelected && "animate-[icon-glow_3s_ease-in-out_infinite]",
	)

	if (type === "folder") {
		const FolderIcon = isOpen
			? iconTheme.icons.folder.open || iconTheme.icons.folder.default
			: iconTheme.icons.folder.default
		return (
			<FolderIcon
				className={baseClassName}
				style={{
					color: folderColor || "#3b82f6",
					fill: folderColor ? `${folderColor}1A` : "#3b82f61A",
				}}
			/>
		)
	}

	if (type === "drawing") {
		const CanvasIcon = iconTheme.icons.activityBar.canvas
		return <CanvasIcon className={cn(baseClassName, "text-purple-500")} />
	}

	const FileIcon = iconTheme.icons.file.default
	return <FileIcon className={baseClassName} />
}
