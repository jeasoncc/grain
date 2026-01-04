/**
 * @file tiptap-editor.container.fn.tsx
 * @description Tiptap 编辑器容器组件
 *
 * 负责数据获取、状态管理和业务逻辑。
 * 使用 @grain/editor-tiptap 包提供的 TiptapDocumentEditor 组件。
 */

import { TiptapDocumentEditor } from "@grain/editor-tiptap";
import type { SerializedContent } from "@grain/editor-core";
import * as E from "fp-ts/Either";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { getContentByNodeId } from "@/db";
import { useUnifiedSave } from "@/hooks/use-unified-save";
import { saveServiceManager } from "@/lib/save-service-manager";
import { cn } from "@/lib/utils";
import logger from "@/log";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";

import type { TiptapEditorContainerProps } from "./tiptap-editor.types";

// ==============================
// Container Component
// ==============================

/**
 * TiptapEditorContainer 容器组件
 *
 * 职责：
 * - 从数据库加载内容
 * - 管理编辑器状态
 * - 使用 useUnifiedSave hook 统一保存逻辑
 */
export const TiptapEditorContainer = memo(function TiptapEditorContainer({
  nodeId,
  className,
}: TiptapEditorContainerProps) {
  // ==============================
  // Store 连接
  // ==============================

  const activeTabId = useEditorTabsStore((s) => s.activeTabId);

  // ==============================
  // 本地状态
  // ==============================

  const [initialContent, setInitialContent] = useState<SerializedContent | undefined>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);

  // 用于在 onSaveSuccess 中访问最新的内容
  const contentRef = useRef<string>("");

  // ==============================
  // 统一保存逻辑
  // ==============================

  const { updateContent, saveNow, setInitialContent: setInitialSaveContent } = useUnifiedSave({
    nodeId,
    contentType: "lexical", // Tiptap 使用 JSON 格式，与 Lexical 兼容
    tabId: activeTabId ?? undefined,
    onSaveSuccess: () => {
      logger.success("[TiptapEditor] 内容保存成功");
    },
    onSaveError: (error) => {
      logger.error("[TiptapEditor] 保存内容失败:", error);
    },
  });

  // ==============================
  // 加载内容
  // ==============================

  useEffect(() => {
    const loadContent = async () => {
      logger.info("[TiptapEditor] 加载内容:", nodeId);

      // 检查是否有待保存的内容
      const pendingContent = saveServiceManager.getPendingContent(nodeId);
      if (pendingContent !== null) {
        logger.info("[TiptapEditor] 使用待保存的内容");
        try {
          JSON.parse(pendingContent);
          setInitialContent({ format: "json", data: pendingContent, version: 1 });
          contentRef.current = pendingContent;
        } catch {
          logger.warn("[TiptapEditor] 解析待保存内容失败");
        }
        setIsInitialized(true);
        return;
      }

      // 从数据库加载内容
      const result = await getContentByNodeId(nodeId)();

      if (E.isRight(result)) {
        const content = result.right;
        if (content) {
          setInitialContent({ format: "json", data: content.content, version: 1 });
          setInitialSaveContent(content.content);
          contentRef.current = content.content;
          logger.success("[TiptapEditor] 内容加载成功");
        } else {
          logger.info("[TiptapEditor] 内容为空，使用默认值");
        }
      } else {
        logger.error("[TiptapEditor] 加载内容失败:", result.left);
      }

      setIsInitialized(true);
    };

    loadContent();
  }, [nodeId, setInitialSaveContent]);

  // ==============================
  // 内容变化处理
  // ==============================

  const handleChange = useCallback(
    (content: SerializedContent) => {
      const serialized = content.data;
      contentRef.current = serialized;
      updateContent(serialized);
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
    <div className={cn("h-full w-full overflow-auto p-4", className)}>
      <TiptapDocumentEditor
        initialContent={initialContent}
        placeholder="Start writing..."
        onChange={handleChange}
        onSave={saveNow}
        className="min-h-full"
      />
    </div>
  );
});
