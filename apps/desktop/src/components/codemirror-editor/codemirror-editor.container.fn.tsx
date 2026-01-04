/**
 * @file codemirror-editor.container.fn.tsx
 * @description CodeMirror 编辑器容器组件
 *
 * 负责数据获取、状态管理和业务逻辑。
 * 使用 @grain/editor-codemirror 包提供的 CodeMirrorDocumentEditor 组件。
 */

import { CodeMirrorDocumentEditor } from "@grain/editor-codemirror";
import type { SerializedContent } from "@grain/editor-core";
import * as E from "fp-ts/Either";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { getContentByNodeId } from "@/db";
import { useUnifiedSave } from "@/hooks/use-unified-save";
import { saveServiceManager } from "@/lib/save-service-manager";
import { cn } from "@/lib/utils";
import logger from "@/log";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";

import type { CodeMirrorEditorContainerProps } from "./codemirror-editor.types";

// ==============================
// Container Component
// ==============================

/**
 * CodeMirrorEditorContainer 容器组件
 *
 * 职责：
 * - 从数据库加载内容
 * - 管理编辑器状态
 * - 使用 useUnifiedSave hook 统一保存逻辑
 */
export const CodeMirrorEditorContainer = memo(function CodeMirrorEditorContainer({
  nodeId,
  className,
}: CodeMirrorEditorContainerProps) {
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
    contentType: "text", // CodeMirror 使用 Markdown 格式
    tabId: activeTabId ?? undefined,
    onSaveSuccess: () => {
      logger.success("[CodeMirrorEditor] 内容保存成功");
    },
    onSaveError: (error) => {
      logger.error("[CodeMirrorEditor] 保存内容失败:", error);
    },
  });

  // ==============================
  // 加载内容
  // ==============================

  useEffect(() => {
    const loadContent = async () => {
      logger.info("[CodeMirrorEditor] 加载内容:", nodeId);

      // 检查是否有待保存的内容
      const pendingContent = saveServiceManager.getPendingContent(nodeId);
      if (pendingContent !== null) {
        logger.info("[CodeMirrorEditor] 使用待保存的内容");
        setInitialContent({ format: "markdown", data: pendingContent, version: 1 });
        contentRef.current = pendingContent;
        setIsInitialized(true);
        return;
      }

      // 从数据库加载内容
      const result = await getContentByNodeId(nodeId)();

      if (E.isRight(result)) {
        const content = result.right;
        if (content) {
          // 尝试解析 JSON 格式的 Lexical 内容，转换为 Markdown
          // 如果失败，直接使用原始内容作为 Markdown
          let markdownContent = content.content;
          try {
            const parsed = JSON.parse(content.content);
            // 如果是 Lexical JSON 格式，提取纯文本
            if (parsed.root && parsed.root.children) {
              markdownContent = extractTextFromLexical(parsed);
            }
          } catch {
            // 不是 JSON，直接使用原始内容
          }
          
          setInitialContent({ format: "markdown", data: markdownContent, version: 1 });
          setInitialSaveContent(markdownContent);
          contentRef.current = markdownContent;
          logger.success("[CodeMirrorEditor] 内容加载成功");
        } else {
          logger.info("[CodeMirrorEditor] 内容为空，使用默认值");
        }
      } else {
        logger.error("[CodeMirrorEditor] 加载内容失败:", result.left);
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
    <div className={cn("h-full w-full", className)}>
      <CodeMirrorDocumentEditor
        initialContent={initialContent}
        placeholder="Start writing in Markdown..."
        showPreview={true}
        previewPosition="right"
        onChange={handleChange}
        onSave={saveNow}
        className="h-full"
      />
    </div>
  );
});

// ==============================
// Helper Functions
// ==============================

/**
 * 从 Lexical JSON 格式提取纯文本
 * 简单实现，只提取文本节点
 */
function extractTextFromLexical(lexicalJson: unknown): string {
  const lines: string[] = [];
  
  function traverse(node: unknown): void {
    if (!node || typeof node !== "object") return;
    
    const n = node as Record<string, unknown>;
    
    if (n.type === "text" && typeof n.text === "string") {
      lines.push(n.text);
    }
    
    if (n.type === "paragraph") {
      lines.push(""); // 段落之间添加空行
    }
    
    if (n.type === "heading" && typeof n.tag === "string") {
      const level = parseInt(n.tag.replace("h", ""), 10);
      lines.push("#".repeat(level) + " ");
    }
    
    if (Array.isArray(n.children)) {
      for (const child of n.children) {
        traverse(child);
      }
    }
  }
  
  traverse(lexicalJson);
  return lines.join("\n").trim();
}
