/**
 * FileTree Component using react-arborist
 * Displays a hierarchical tree structure with VS Code-like experience.
 * Features: drag-drop, virtualization, keyboard navigation, inline rename.
 *
 * Requirements: 2.1
 */

import { useMemo, useRef, useCallback } from "react";
import { Tree, type NodeRendererProps, type NodeApi } from "react-arborist";
import { FolderPlus, Plus, FileText, Folder, FolderOpen, PenTool, ChevronRight, ChevronDown, Calendar, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useNodesByWorkspace, toggleNodeCollapsed } from "@/services/nodes";
import type { NodeType, NodeInterface } from "@/db/schema";

export interface FileTreeProps {
  workspaceId: string | null;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onCreateFolder: (parentId: string | null) => void;
  onCreateFile: (parentId: string | null, type: NodeType) => void;
  onDeleteNode: (nodeId: string) => void;
  onRenameNode: (nodeId: string, newTitle: string) => void;
  onMoveNode: (nodeId: string, newParentId: string | null, newIndex: number) => void;
  onCreateDiary?: () => void;
}

// Data type for react-arborist
interface TreeData {
  id: string;
  name: string;
  type: NodeType;
  collapsed: boolean;
  children?: TreeData[];
}

// Build tree data for react-arborist
function buildArboristTree(
  nodes: NodeInterface[],
  parentId: string | null = null
): TreeData[] {
  return nodes
    .filter((n) => n.parent === parentId)
    .sort((a, b) => a.order - b.order)
    .map((node) => ({
      id: node.id,
      name: node.title,
      type: node.type,
      collapsed: node.collapsed ?? true,
      children: node.type === "folder" ? buildArboristTree(nodes, node.id) : undefined,
    }));
}

// Custom node renderer
function Node({
  node,
  style,
  dragHandle,
  onDelete,
  onCreateFolder,
  onCreateFile,
}: NodeRendererProps<TreeData> & {
  onDelete: (nodeId: string) => void;
  onCreateFolder: (parentId: string | null) => void;
  onCreateFile: (parentId: string | null, type: NodeType) => void;
}) {
  const data = node.data;
  const isFolder = data.type === "folder";

  const getIcon = () => {
    switch (data.type) {
      case "folder":
        return node.isOpen ? (
          <FolderOpen className="size-4 shrink-0 text-blue-500" />
        ) : (
          <Folder className="size-4 shrink-0 text-blue-500/70" />
        );
      case "canvas":
        return <PenTool className="size-4 shrink-0 text-purple-500/70" />;
      default:
        return <FileText className="size-4 shrink-0 text-muted-foreground" />;
    }
  };

  return (
    <div
      style={style}
      ref={dragHandle}
      className={cn(
        "group flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer transition-all",
        node.isSelected
          ? "bg-primary/10 text-primary"
          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        node.willReceiveDrop && "bg-sidebar-accent ring-1 ring-primary/20"
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (isFolder) {
          node.toggle();
        } else {
          node.select();
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        node.edit();
      }}
    >
      {/* Expand/Collapse chevron for folders */}
      {isFolder ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            node.toggle();
          }}
          className="p-0.5 hover:bg-black/5 rounded shrink-0"
        >
          {node.isOpen ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
        </button>
      ) : (
        <span className="w-4" />
      )}

      {getIcon()}

      {node.isEditing ? (
        <Input
          autoFocus
          defaultValue={data.name}
          className="h-6 text-sm px-1 py-0 flex-1"
          onBlur={() => node.reset()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              node.submit(e.currentTarget.value);
            } else if (e.key === "Escape") {
              node.reset();
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 text-sm truncate">{data.name}</span>
      )}

      {isFolder && node.children && node.children.length > 0 && !node.isEditing && (
        <span className="text-xs text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity mr-1">
          {node.children.length}
        </span>
      )}

      {/* Action menu button - visible on hover */}
      {!node.isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              title="More actions"
            >
              <MoreHorizontal className="size-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {/* Create options - only show for folders */}
            {isFolder && (
              <>
                <DropdownMenuItem onClick={() => onCreateFolder(node.id)}>
                  <FolderPlus className="size-4 mr-2" />
                  新建文件夹
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Plus className="size-4 mr-2" />
                    新建文件
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => onCreateFile(node.id, "file")}>
                      <FileText className="size-4 mr-2" />
                      文本文件
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCreateFile(node.id, "canvas")}>
                      <PenTool className="size-4 mr-2" />
                      画布
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Rename option */}
            <DropdownMenuItem onClick={() => node.edit()}>
              <Pencil className="size-4 mr-2" />
              重命名
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Delete option */}
            <DropdownMenuItem
              onClick={() => onDelete(node.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4 mr-2" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function FileTree({
  workspaceId,
  selectedNodeId,
  onSelectNode,
  onCreateFolder,
  onCreateFile,
  onDeleteNode,
  onRenameNode,
  onMoveNode,
  onCreateDiary,
}: FileTreeProps) {
  const nodes = useNodesByWorkspace(workspaceId) ?? [];
  const treeData = useMemo(() => buildArboristTree(nodes), [nodes]);
  const treeRef = useRef<any>(null);

  // Handle selection change
  const handleSelect = useCallback(
    (selectedNodes: NodeApi<TreeData>[]) => {
      if (selectedNodes.length > 0) {
        const node = selectedNodes[0];
        if (node.data.type !== "folder") {
          onSelectNode(node.id);
        }
      }
    },
    [onSelectNode]
  );

  // Handle rename
  const handleRename = useCallback(
    ({ id, name }: { id: string; name: string }) => {
      if (name.trim()) {
        onRenameNode(id, name.trim());
      }
    },
    [onRenameNode]
  );

  // Handle move (drag and drop)
  const handleMove = useCallback(
    ({
      dragIds,
      parentId,
      index,
    }: {
      dragIds: string[];
      parentId: string | null;
      index: number;
    }) => {
      if (dragIds.length > 0) {
        onMoveNode(dragIds[0], parentId, index);
      }
    },
    [onMoveNode]
  );

  // Handle toggle (expand/collapse)
  const handleToggle = useCallback(async (id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (node) {
      await toggleNodeCollapsed(id, !node.collapsed);
    }
  }, [nodes]);

  // Custom node renderer with inline action menu
  const renderNode = useCallback(
    (props: NodeRendererProps<TreeData>) => {
      return (
        <Node
          {...props}
          onDelete={onDeleteNode}
          onCreateFolder={onCreateFolder}
          onCreateFile={onCreateFile}
        />
      );
    },
    [onDeleteNode, onCreateFolder, onCreateFile]
  );

  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Folder className="size-12 mb-3 opacity-20" />
        <p className="text-sm text-center px-4">请先选择一个工作空间</p>
        <p className="text-xs text-center mt-1 opacity-70">Please select a workspace first</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-sidebar-border/20">
        <div className="flex items-center gap-2 font-semibold text-foreground/80">
          <Folder className="size-5" />
          <span>Files</span>
        </div>
        <div className="flex items-center gap-1">
          {onCreateDiary && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={onCreateDiary}
              title="Create new diary"
            >
              <Calendar className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onCreateFolder(null)}
            title="Create new folder"
          >
            <FolderPlus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onCreateFile(null, "file")}
            title="Create new file"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 px-2 py-2 overflow-hidden">
        {treeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="size-12 mb-3 opacity-20" />
            <p className="text-sm text-center">No files yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => onCreateFile(null, "file")}
            >
              <Plus className="size-4 mr-1" />
              Create File
            </Button>
          </div>
        ) : (
          <Tree
            ref={treeRef}
            data={treeData}
            selection={selectedNodeId ?? undefined}
            onSelect={handleSelect}
            onRename={handleRename}
            onMove={handleMove}
            onToggle={handleToggle}
            indent={16}
            rowHeight={32}
            overscanCount={5}
            openByDefault={false}
            disableMultiSelection
            className="h-full w-full [&>div]:w-full"
            width="100%"
          >
            {renderNode}
          </Tree>
        )}
      </div>
    </div>
  );
}
