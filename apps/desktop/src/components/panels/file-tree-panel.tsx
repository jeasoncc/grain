/**
 * FileTreePanel - 文件树面板
 * 使用新的 Node 结构管理工作空间内容
 * 
 * Requirements: 2.1, 2.3, 3.3, 1.1, 1.5, 3.1
 */

import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm";
import { FileTree } from "@/components/file-tree";
import type { NodeType } from "@/db/schema";
import { useSelectionStore } from "@/stores/selection";
import { useEditorTabsStore } from "@/stores/editor-tabs";
import {
  createNode,
  deleteNode as deleteNodeService,
  renameNode as renameNodeService,
  moveNode as moveNodeService,
  getNode,
} from "@/services/nodes";
import { createDiaryInFileTree } from "@/services/diary-v2";

interface FileTreePanelProps {
  /** Optional workspace ID override. If not provided, uses global selection */
  workspaceId?: string | null;
}

export function FileTreePanel({ workspaceId: propWorkspaceId }: FileTreePanelProps) {
  const navigate = useNavigate();
  const confirm = useConfirm();

  // Global selection state
  const globalSelectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId);
  const workspaceId = propWorkspaceId ?? globalSelectedWorkspaceId;

  // Selected node state - use global store for cross-component communication
  const selectedNodeId = useSelectionStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useSelectionStore((s) => s.setSelectedNodeId);

  // Clear selection when workspace changes
  // Requirements: 3.3
  const prevWorkspaceIdRef = useRef(workspaceId);
  useEffect(() => {
    if (prevWorkspaceIdRef.current !== workspaceId) {
      setSelectedNodeId(null);
      prevWorkspaceIdRef.current = workspaceId;
    }
  }, [workspaceId, setSelectedNodeId]);

  // Editor tabs
  const openTab = useEditorTabsStore((s) => s.openTab);
  const updateEditorState = useEditorTabsStore((s) => s.updateEditorState);
  const editorStates = useEditorTabsStore((s) => s.editorStates);

  // Handle node selection - open file in editor
  const handleSelectNode = useCallback(async (nodeId: string) => {
    setSelectedNodeId(nodeId);

    // Get node details to open in editor
    const node = await getNode(nodeId);
    if (!node) return;

    // Only open files (not folders) in editor
    if (node.type === "folder") return;

    if (workspaceId) {
      // Pre-load content into editorStates if not already loaded
      // This ensures the editor is initialized with the correct content
      if (!editorStates[nodeId]?.serializedState) {
        const { getNodeContent } = await import("@/services/nodes");
        const content = await getNodeContent(nodeId);
        if (content) {
          try {
            const parsed = JSON.parse(content);
            updateEditorState(nodeId, { serializedState: parsed });
          } catch {
            // Ignore parse errors
          }
        }
      }

      // Map node type to editor tab type
      const tabType = node.type === "canvas" ? "canvas" : 
                      node.type === "diary" ? "diary" : "file";
      openTab({
        workspaceId: workspaceId,
        nodeId: nodeId,
        title: node.title,
        type: tabType,
      });
    }

    // Navigate based on file type
    if (node.type === "canvas") {
      navigate({ to: "/canvas" });
    } else {
      navigate({ to: "/" });
    }
  }, [workspaceId, openTab, navigate, editorStates, updateEditorState]);

  // Handle folder creation
  const handleCreateFolder = useCallback(async (parentId: string | null) => {
    if (!workspaceId) {
      toast.error("Please select a workspace first");
      return;
    }

    try {
      await createNode({
        workspaceId,
        parentId,
        type: "folder",
        title: "New Folder",
      });
      toast.success("Folder created");
    } catch (error) {
      console.error("Failed to create folder:", error);
      toast.error("Failed to create folder");
    }
  }, [workspaceId]);

  // Handle file creation
  const handleCreateFile = useCallback(async (parentId: string | null, type: NodeType) => {
    if (!workspaceId) {
      toast.error("Please select a workspace first");
      return;
    }

    try {
      const title = type === "canvas" ? "New Canvas" : "New File";
      const content = type === "canvas" 
        ? JSON.stringify({ elements: [], appState: {}, files: {} })
        : "";

      const newNode = await createNode({
        workspaceId,
        parentId,
        type,
        title,
        content,
      });

      toast.success(`${type === "canvas" ? "Canvas" : "File"} created`);

      // Auto-select and open the new file
      if (newNode && type !== "folder") {
        handleSelectNode(newNode.id);
      }
    } catch (error) {
      console.error("Failed to create file:", error);
      toast.error("Failed to create file");
    }
  }, [workspaceId, handleSelectNode]);

  // Editor tabs for closing deleted files
  const closeTab = useEditorTabsStore((s) => s.closeTab);

  // Handle node deletion
  const handleDeleteNode = useCallback(async (nodeId: string) => {
    const node = await getNode(nodeId);
    if (!node) return;

    const isFolder = node.type === "folder";
    const ok = await confirm({
      title: `Delete ${isFolder ? "folder" : "file"}?`,
      description: isFolder
        ? `Are you sure you want to delete "${node.title}"? This will also delete all contents inside. This cannot be undone.`
        : `Are you sure you want to delete "${node.title}"? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!ok) return;

    try {
      await deleteNodeService(nodeId);
      
      // Close the tab if the deleted node was open in editor
      closeTab(nodeId);
      
      // Clear selection if deleted node was selected
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
      
      toast.success(`${isFolder ? "Folder" : "File"} deleted`);
    } catch (error) {
      console.error("Failed to delete node:", error);
      toast.error("Failed to delete");
    }
  }, [confirm, selectedNodeId, closeTab, setSelectedNodeId]);

  // Handle node rename
  const handleRenameNode = useCallback(async (nodeId: string, newTitle: string) => {
    if (!newTitle.trim()) return;

    try {
      await renameNodeService(nodeId, newTitle.trim());
    } catch (error) {
      console.error("Failed to rename node:", error);
      toast.error("Failed to rename");
    }
  }, []);

  // Handle node move (drag and drop)
  const handleMoveNode = useCallback(async (
    nodeId: string,
    newParentId: string | null,
    newIndex: number
  ) => {
    try {
      await moveNodeService(nodeId, newParentId, newIndex);
    } catch (error) {
      console.error("Failed to move node:", error);
      if (error instanceof Error && error.message.includes("descendants")) {
        toast.error("Cannot move a folder into itself");
      } else {
        toast.error("Failed to move");
      }
    }
  }, []);

  // Handle diary creation
  // Requirements: 1.1, 1.5, 3.1
  const handleCreateDiary = useCallback(async () => {
    if (!workspaceId) {
      toast.error("Please select a workspace first");
      return;
    }

    try {
      const diaryNode = await createDiaryInFileTree(workspaceId);
      
      // Pre-load the diary content into editorStates BEFORE opening the tab
      // This ensures the editor is initialized with the template content
      const { getNodeContent } = await import("@/services/nodes");
      const content = await getNodeContent(diaryNode.id);
      if (content) {
        try {
          const parsed = JSON.parse(content);
          updateEditorState(diaryNode.id, { serializedState: parsed });
        } catch {
          // Ignore parse errors
        }
      }
      
      toast.success("Diary created");

      // Auto-select and open the new diary file
      handleSelectNode(diaryNode.id);
    } catch (error) {
      console.error("Failed to create diary:", error);
      toast.error("Failed to create diary");
    }
  }, [workspaceId, handleSelectNode, updateEditorState]);

  return (
    <FileTree
      workspaceId={workspaceId}
      selectedNodeId={selectedNodeId}
      onSelectNode={handleSelectNode}
      onCreateFolder={handleCreateFolder}
      onCreateFile={handleCreateFile}
      onDeleteNode={handleDeleteNode}
      onRenameNode={handleRenameNode}
      onMoveNode={handleMoveNode}
      onCreateDiary={handleCreateDiary}
    />
  );
}
