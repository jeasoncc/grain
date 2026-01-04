/**
 * @file codemirror-code-editor.container.fn.tsx
 * @description CodeMirror 代码编辑器容器组件
 *
 * 负责数据获取、状态管理和业务逻辑。
 * 使用 @grain/editor-codemirror 包提供的 CodeMirrorCodeEditor 组件。
 */

import { CodeMirrorCodeEditor } from "@grain/editor-codemirror";
import type { SupportedLanguage } from "@grain/editor-core";
import * as E from "fp-ts/Either";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { getContentByNodeId } from "@/db";
import { useUnifiedSave } from "@/hooks/use-unified-save";
import { saveServiceManager } from "@/lib/save-service-manager";
import { cn } from "@/lib/utils";
import logger from "@/log";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";

import type { CodeMirrorCodeEditorContainerProps } from "./codemirror-code-editor.types";

// ==============================
// Helper Functions
// ==============================

/**
 * 根据文件名获取 CodeMirror 语言
 */
function getCodeMirrorLanguage(filename: string): SupportedLanguage {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  
  const languageMap: Record<string, SupportedLanguage> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rs: "rust",
    json: "json",
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    sql: "sql",
    md: "markdown",
  };
  
  return languageMap[ext] ?? "plaintext";
}

// ==============================
// Container Component
// ==============================

/**
 * CodeMirrorCodeEditorContainer 容器组件
 *
 * 职责：
 * - 从数据库加载代码内容
 * - 管理编辑器状态
 * - 使用 useUnifiedSave hook 统一保存逻辑
 */
export const CodeMirrorCodeEditorContainer = memo(function CodeMirrorCodeEditorContainer({
  nodeId,
  className,
}: CodeMirrorCodeEditorContainerProps) {
  // ==============================
  // Store 连接
  // ==============================

  const activeTabId = useEditorTabsStore((s) => s.activeTabId);
  const tabs = useEditorTabsStore((s) => s.tabs);
  const activeTab = tabs.find((t) => t.id === activeTabId);

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
      logger.success("[CodeMirrorCodeEditor] 内容保存成功");
    },
    onSaveError: (error) => {
      logger.error("[CodeMirrorCodeEditor] 保存内容失败:", error);
    },
  });

  // ==============================
  // 加载内容
  // ==============================

  useEffect(() => {
    const loadContent = async () => {
      logger.info("[CodeMirrorCodeEditor] 加载内容:", nodeId);

      // 检查是否有待保存的内容
      const pendingContent = saveServiceManager.getPendingContent(nodeId);
      if (pendingContent !== null) {
        logger.info("[CodeMirrorCodeEditor] 使用待保存的内容");
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
          logger.success("[CodeMirrorCodeEditor] 内容加载成功");
        } else {
          logger.info("[CodeMirrorCodeEditor] 内容为空，使用默认值");
        }
      } else {
        logger.error("[CodeMirrorCodeEditor] 加载内容失败:", result.left);
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
  // 语言检测
  // ==============================

  const language = getCodeMirrorLanguage(activeTab?.title ?? "code.js");

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
      <CodeMirrorCodeEditor
        initialContent={code}
        language={language}
        placeholder="Enter code..."
        onChange={handleCodeChange}
        onSave={saveNow}
        className="h-full"
      />
    </div>
  );
});
