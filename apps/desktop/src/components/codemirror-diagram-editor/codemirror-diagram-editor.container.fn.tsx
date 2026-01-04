/**
 * @file codemirror-diagram-editor.container.fn.tsx
 * @description CodeMirror 图表编辑器容器组件
 *
 * 负责数据获取、状态管理和业务逻辑。
 * 使用 @grain/editor-codemirror 包提供的 CodeMirrorDiagramEditor 组件。
 */

import { CodeMirrorDiagramEditor } from "@grain/editor-codemirror";
import * as E from "fp-ts/Either";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { getContentByNodeId } from "@/db";
import { useUnifiedSave } from "@/hooks/use-unified-save";
import { saveServiceManager } from "@/lib/save-service-manager";
import { cn } from "@/lib/utils";
import logger from "@/log";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";

import type { CodeMirrorDiagramEditorContainerProps } from "./codemirror-diagram-editor.types";

// ==============================
// Container Component
// ==============================

/**
 * CodeMirrorDiagramEditorContainer 容器组件
 *
 * 职责：
 * - 从数据库加载图表内容
 * - 管理编辑器状态
 * - 使用 useUnifiedSave hook 统一保存逻辑
 */
export const CodeMirrorDiagramEditorContainer = memo(function CodeMirrorDiagramEditorContainer({
  nodeId,
  diagramType,
  className,
}: CodeMirrorDiagramEditorContainerProps) {
  // ==============================
  // Store 连接
  // ==============================

  const activeTabId = useEditorTabsStore((s) => s.activeTabId);

  // ==============================
  // 本地状态
  // ==============================

  const [code, setCode] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // 用于在 onSaveSuccess 中访问最新的 code
  const codeRef = useRef(code);
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // ==============================
  // 统一保存逻辑
  // ==============================

  const { updateContent, saveNow, setInitialContent } = useUnifiedSave({
    nodeId,
    contentType: "text",
    tabId: activeTabId ?? undefined,
    registerShortcut: false, // CodeMirror 有自己的快捷键处理
    onSaveSuccess: () => {
      logger.success("[CodeMirrorDiagramEditor] 内容保存成功");
    },
    onSaveError: (error) => {
      logger.error("[CodeMirrorDiagramEditor] 保存内容失败:", error);
    },
  });

  // ==============================
  // 加载内容
  // ==============================

  useEffect(() => {
    const loadContent = async () => {
      logger.info("[CodeMirrorDiagramEditor] 加载内容:", nodeId);

      // 检查是否有待保存的内容
      const pendingContent = saveServiceManager.getPendingContent(nodeId);
      if (pendingContent !== null) {
        logger.info("[CodeMirrorDiagramEditor] 使用待保存的内容");
        setCode(pendingContent);
        setIsInitialized(true);
        return;
      }

      // 从数据库加载内容
      const result = await getContentByNodeId(nodeId)();

      if (E.isRight(result)) {
        const content = result.right;
        if (content) {
          setCode(content.content);
          setInitialContent(content.content);
          logger.success("[CodeMirrorDiagramEditor] 内容加载成功");
        } else {
          logger.info("[CodeMirrorDiagramEditor] 内容为空，使用默认值");
        }
      } else {
        logger.error("[CodeMirrorDiagramEditor] 加载内容失败:", result.left);
      }

      setIsInitialized(true);
    };

    loadContent();
  }, [nodeId, setInitialContent]);

  // ==============================
  // 代码变化处理
  // ==============================

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      updateContent(newCode);
    },
    [updateContent],
  );

  // ==============================
  // 渲染
  // ==============================

  if (!isInitialized) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-full w-full text-muted-foreground",
          className,
        )}
      >
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className={cn("h-full w-full", className)}>
      <CodeMirrorDiagramEditor
        initialSource={code}
        diagramType={diagramType}
        placeholder={`Enter ${diagramType} diagram code...`}
        onChange={handleCodeChange}
        onSave={saveNow}
        className="h-full"
      />
    </div>
  );
});
