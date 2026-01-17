/**
 * FileTree Component using react-arborist (纯声明式)
 * Displays a hierarchical tree structure with VS Code-like experience.
 * Features: drag-drop, virtualization, keyboard navigation, inline rename.
 *
 * 纯展示组件：所有逻辑封装在 use-file-tree.ts hook 中
 * 组件只负责渲染，像 HTML 一样声明式
 */

import { ChevronsDownUp, ChevronsUpDown, FolderPlus, Plus } from "lucide-react"
import { useCallback, useMemo } from "react"
import { Tree } from "react-arborist"
import { useFileTree } from "@/hooks/use-file-tree"
import {
	calculateCollapseAllFolders,
	calculateExpandAllFolders,
	hasFolders,
} from "@/pipes/node"
import { useSidebarStore } from "@/state/sidebar.state"
import { Button } from "@/views/ui/button"
import type { FileTreeProps } from "./file-tree.types"
import { TreeNode } from "@/views/file-tree/tree-node.view.fn"

/**
 * FileTree Props 接口
 *
 * 纯展示组件：所有数据和回调通过 props 传入
 */
export type { FileTreeProps, TreeData } from "./file-tree.types"

// ============================================================================
// 主组件（纯声明式）
// ============================================================================

/**
 * FileTree - 文件树组件（纯声明式）
 *
 * 数据流：
 *   props → useFileTree hook → 渲染
 *
 * 职责：
 * - 纯 UI 渲染
 * - 所有逻辑在 useFileTree hook 中
 */
export function FileTree(props: FileTreeProps) {
	const {
		workspaceId,
		nodes,
		selectedNodeId,
		onSelectNode,
		onCreateFolder,
		onCreateFile,
		onDeleteNode,
		onRenameNode,
		onMoveNode,
		onToggleCollapsed,
		treeRef: externalTreeRef,
	} = props

	const {
		treeData,
		dimensions,
		containerRef,
		treeRef,
		iconTheme,
		currentTheme,
		handlers,
		nodeProps,
	} = useFileTree({
		workspaceId,
		nodes,
		selectedNodeId,
		onSelectNode,
		onCreateFolder,
		onCreateFile,
		onDeleteNode,
		onRenameNode,
		onMoveNode,
		onToggleCollapsed,
		treeRef: externalTreeRef,
	})

	// Expand/Collapse All handlers
	const setExpandedFolders = useSidebarStore((state) => state.setExpandedFolders)

	const handleExpandAll = useCallback(() => {
		const expandedState = calculateExpandAllFolders(nodes)
		setExpandedFolders(expandedState)
		// Sync with react-arborist
		if (treeRef.current) {
			Object.keys(expandedState).forEach((folderId) => {
				treeRef.current?.open(folderId)
			})
		}
	}, [nodes, setExpandedFolders, treeRef])

	const handleCollapseAll = useCallback(() => {
		const collapsedState = calculateCollapseAllFolders(nodes)
		setExpandedFolders(collapsedState)
		// Sync with react-arborist
		if (treeRef.current) {
			Object.keys(collapsedState).forEach((folderId) => {
				treeRef.current?.close(folderId)
			})
		}
	}, [nodes, setExpandedFolders, treeRef])

	const hasAnyFolders = useMemo(() => hasFolders(nodes), [nodes])

	// No workspace selected
	if (!workspaceId) {
		const FolderIcon = iconTheme.icons.folder.default
		return (
			<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<FolderIcon
					className="size-12 mb-3 opacity-20"
					style={{ color: currentTheme?.colors.folderColor || "#3b82f6" }}
				/>
				<p className="text-sm text-center px-4">Please select a workspace first</p>
			</div>
		)
	}

	return (
		<div className="group/panel flex h-full w-full flex-col" data-testid="file-tree">
			<div className="h-11 flex items-center justify-between px-4 shrink-0 group/header">
				<span className="text-sm font-semibold text-foreground/80 tracking-wide pl-1">
					Explorer
				</span>
				<div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
					<Button
						variant="ghost"
						size="icon"
						className="size-7 hover:bg-sidebar-accent rounded-sm"
						onClick={handleExpandAll}
						disabled={!hasAnyFolders}
						title="全部展开 / Expand All"
					>
						<ChevronsDownUp className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-7 hover:bg-sidebar-accent rounded-sm"
						onClick={handleCollapseAll}
						disabled={!hasAnyFolders}
						title="全部折叠 / Collapse All"
					>
						<ChevronsUpDown className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-7 hover:bg-sidebar-accent rounded-sm"
						onClick={() => onCreateFolder(null)}
						title="Create new folder"
					>
						<FolderPlus className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-7 hover:bg-sidebar-accent rounded-sm"
						onClick={() => onCreateFile(null, "file")}
						title="Create new file"
					>
						<Plus className="size-4" />
					</Button>
				</div>
			</div>

			<div className="flex-1 w-full overflow-hidden pb-6" ref={containerRef}>
				{treeData.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
						{(() => {
							const FileIcon = iconTheme.icons.file.default
							return <FileIcon className="size-12 mb-3 opacity-20" />
						})()}
						<p className="text-sm text-center px-4">No files yet</p>
						<Button
							variant="outline"
							size="sm"
							className="mt-3 text-xs"
							onClick={() => onCreateFile(null, "file")}
						>
							<Plus className="size-3 mr-1" />
							Create File
						</Button>
					</div>
				) : (
					<div className="w-full h-full">
						<Tree
							ref={treeRef}
							data={treeData}
							selection={selectedNodeId ?? undefined}
							onSelect={handlers.onSelect}
							onRename={handlers.onRename}
							onMove={handlers.onMove}
							onToggle={handlers.onToggle}
							indent={12}
							rowHeight={30}
							overscanCount={5}
							openByDefault={false}
							disableMultiSelection
							className="outline-none"
							width={dimensions.width}
							height={dimensions.height}
						>
							{(props) => <TreeNode {...props} {...nodeProps} />}
						</Tree>
					</div>
				)}
			</div>
		</div>
	)
}
