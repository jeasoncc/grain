/**
 * FileTree Component using react-arborist
 * Displays a hierarchical tree structure with VS Code-like experience.
 * Features: drag-drop, virtualization, keyboard navigation, inline rename.
 *
 * Requirements: 2.1
 */

import { useMemo, useRef, useCallback } from "react";
import { Tree, type NodeRendererProps, type NodeApi } from "react-arborist";
import { FolderPlus, Plus, Calendar, MoreHorizontal, Pencil, Trash2, ChevronRight, ChevronDown, FileText } from "lucide-react";
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
import { useIconTheme } from "@/hooks/use-icon-theme";
import { useTheme } from "@/hooks/use-theme";

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
  folderColor,
  hasSelection,
}: NodeRendererProps<TreeData> & {
  onDelete: (nodeId: string) => void;
  onCreateFolder: (parentId: string | null) => void;
  onCreateFile: (parentId: string | null, type: NodeType) => void;
  folderColor?: string;
  hasSelection: boolean;
}) {
  const data = node.data;
  const isFolder = data.type === "folder";
  const iconTheme = useIconTheme();

  const getIcon = () => {
    switch (data.type) {
      case "folder":
        const FolderIcon = node.isOpen 
          ? (iconTheme.icons.folder.open || iconTheme.icons.folder.default)
          : iconTheme.icons.folder.default;
        return (
          <FolderIcon
            className="size-4 shrink-0 transition-opacity duration-200"
            style={{ 
              color: folderColor || "#3b82f6",
              fill: folderColor ? `${folderColor}1A` : "#3b82f61A",
              opacity: (!hasSelection || node.isSelected) ? 1 : 0.5
            }} 
          />
        );
      case "canvas":
        const CanvasIcon = iconTheme.icons.activityBar.canvas;
        return (
          <div className={cn("relative flex items-center justify-center transition-opacity duration-200", (!hasSelection || node.isSelected) ? "opacity-100" : "opacity-50")}>
            <CanvasIcon className="size-4 shrink-0 text-purple-500" />
            {node.isSelected && (
              <div className="absolute inset-0 bg-primary/20 blur-[2px] rounded-full animate-pulse" />
            )}
          </div>
        );
      default:
        const FileIcon = iconTheme.icons.file.default;
        return (
          <div className={cn("relative flex items-center justify-center transition-opacity duration-200", (!hasSelection || node.isSelected) ? "opacity-100" : "opacity-50")}>
            <FileIcon
              className={cn("size-4 shrink-0", node.isSelected && "text-primary")}
            />
            {node.isSelected && (
              <div className="absolute inset-0 bg-primary/20 blur-[2px] rounded-full animate-pulse" />
            )}
          </div>
        );
    }
  };

  return (
    <div
      style={style}
      ref={dragHandle}
      className={cn(
        "group flex items-center gap-1.5 py-1 pr-2 cursor-pointer transition-all duration-200 px-2 rounded-md mx-1 overflow-hidden",
        node.isSelected
          ? "bg-primary/5 shadow-sm"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        !node.isSelected && hasSelection && "opacity-60 hover:opacity-100",
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
          className="p-0.5 hover:bg-foreground/10 rounded-sm shrink-0 transition-colors -ml-1"
        >
          {node.isOpen ? (
            <ChevronDown className="size-3.5 opacity-70" />
          ) : (
            <ChevronRight className="size-3.5 opacity-70" />
          )}
        </button>
      ) : (
        <span className="w-3.5 -ml-1" />
      )}

      {getIcon()}

      {node.isEditing ? (
        <Input
          autoFocus
          defaultValue={data.name}
          className="h-6 text-sm px-1 py-0 flex-1 min-w-0"
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
        <span 
          className={cn(
            "flex-1 text-sm truncate leading-none pb-0.5 min-w-0 transition-colors duration-200",
            node.isSelected ? "text-foreground font-medium" : "text-muted-foreground",
            !node.isSelected && hasSelection && "text-muted-foreground/70"
          )}
          title={data.name}
        >
          {data.name}
        </span>
      )}

      {isFolder && node.children && node.children.length > 0 && !node.isEditing && (
        <span className="text-xs opacity-50 group-hover:opacity-100 transition-opacity mr-1">
          {node.children.length}
        </span>
      )}

      {/* Action menu button - visible on hover */}
      {!node.isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-0.5 hover:bg-foreground/10 rounded-sm shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
                      {(() => {
                        const CanvasIcon = iconTheme.icons.activityBar.canvas;
                        return <CanvasIcon className="size-4 mr-2" />;
                      })()}
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
}: FileTreeProps) {
  const nodes = useNodesByWorkspace(workspaceId) ?? [];
  const treeData = useMemo(() => buildArboristTree(nodes), [nodes]);
  const treeRef = useRef<any>(null);
  const iconTheme = useIconTheme();
  const { currentTheme } = useTheme();

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
          folderColor={currentTheme?.colors.folderColor}
          hasSelection={!!selectedNodeId}
        />
      );
    },
    [onDeleteNode, onCreateFolder, onCreateFile, currentTheme?.colors.folderColor, selectedNodeId]
  );

  if (!workspaceId) {
    const FolderIcon = iconTheme.icons.folder.default;
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FolderIcon
          className="size-12 mb-3 opacity-20"
          style={{ 
            color: currentTheme?.colors.folderColor || "#3b82f6",
            fill: currentTheme?.colors.folderColor ? `${currentTheme.colors.folderColor}1A` : "#3b82f61A" 
          }} 
        />
        <p className="text-sm text-center px-4">请先选择一个工作空间</p>
        <p className="text-xs text-center mt-1 opacity-70">Please select a workspace first</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="h-11 flex items-center justify-between px-4 shrink-0 group/header">
        <span className="text-sm font-semibold text-foreground/80 tracking-wide pl-1">
          Explorer
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity duration-200">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 hover:bg-sidebar-accent hover:text-foreground rounded-sm"
            onClick={() => onCreateFolder(null)}
            title="Create new folder"
          >
            <FolderPlus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 hover:bg-sidebar-accent hover:text-foreground rounded-sm"
            onClick={() => onCreateFile(null, "file")}
            title="Create new file"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-hidden">
        {treeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            {(() => {
                const FileIcon = iconTheme.icons.file.default;
                return <FileIcon className="size-12 mb-3 opacity-20" />;
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
          <Tree
            ref={treeRef}
            data={treeData}
            selection={selectedNodeId ?? undefined}
            onSelect={handleSelect}
            onRename={handleRename}
            onMove={handleMove}
            onToggle={handleToggle}
            indent={12}
            rowHeight={30}
            overscanCount={5}
            openByDefault={false}
            disableMultiSelection
            className="h-full w-full [&>div]:w-full outline-none"
            width="100%"
          >
            {renderNode}
          </Tree>
        )}
      </div>
    </div>
  );
}
