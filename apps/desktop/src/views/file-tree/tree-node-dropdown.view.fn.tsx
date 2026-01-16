/**
 * @file tree-node-dropdown.view.fn.tsx
 * @description 树节点下拉菜单组件
 *
 * 职责：提供节点的上下文菜单操作
 * 依赖规则：views/ 只能依赖 hooks/, types/
 */

import { FileText, FolderPlus, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import type { NodeType } from "@/types/node"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/views/ui/dropdown-menu"

// ============================================================================
// 类型定义
// ============================================================================

export interface TreeNodeDropdownProps {
	readonly nodeId: string
	readonly isFolder: boolean
	readonly onEdit: () => void
	readonly onDelete: (nodeId: string) => void
	readonly onCreateFolder: (parentId: string | null) => void
	readonly onCreateFile: (parentId: string | null, type: NodeType) => void
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 树节点下拉菜单组件
 */
export function TreeNodeDropdown({
	nodeId,
	isFolder,
	onEdit,
	onDelete,
	onCreateFolder,
	onCreateFile,
}: TreeNodeDropdownProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					onClick={(e) => e.stopPropagation()}
					className="p-0.5 hover:bg-foreground/10 rounded-sm shrink-0 opacity-0 group-hover:opacity-100"
				>
					<MoreHorizontal className="size-3.5 text-muted-foreground" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-48">
				{isFolder && (
					<>
						<DropdownMenuItem onClick={() => onCreateFolder(nodeId)}>
							<FolderPlus className="size-4 mr-2" />
							New Folder
						</DropdownMenuItem>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<Plus className="size-4 mr-2" />
								New File
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								<DropdownMenuItem onClick={() => onCreateFile(nodeId, "file")}>
									<FileText className="size-4 mr-2" />
									Text File
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => onCreateFile(nodeId, "drawing")}>
									<FileText className="size-4 mr-2" />
									Canvas
								</DropdownMenuItem>
							</DropdownMenuSubContent>
						</DropdownMenuSub>
						<DropdownMenuSeparator />
					</>
				)}
				<DropdownMenuItem onClick={onEdit}>
					<Pencil className="size-4 mr-2" />
					Rename
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => onDelete(nodeId)}
					className="text-destructive focus:text-destructive"
				>
					<Trash2 className="size-4 mr-2" />
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
