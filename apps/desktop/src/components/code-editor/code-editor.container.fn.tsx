/**
 * @file code-editor.container.fn.tsx
 * @description CodeEditor 容器组件
 *
 * 负责数据获取、状态管理和业务逻辑。
 * 将数据通过 props 传递给纯展示组件 CodeEditorView。
 * 支持 Ctrl+S 快捷键立即保存。
 *
 * 数据流（保存）：
 * Editor → useUnifiedSave → UnifiedSaveService → DB → Tab.isDirty → SaveStore → UI 反馈
 *
 * @requirements 5.2, 5.3, 5.5
 */

import { CodeEditorView } from "@grain/code-editor";
import * as E from "fp-ts/Either";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getContentByNodeId } from "@/db";
import { getMonacoLanguage } from "@/fn/editor";
import { useTheme } from "@/hooks/use-theme";
import { useUnifiedSave } from "@/hooks/use-unified-save";
import { cn } from "@/lib/utils";
import logger from "@/log";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";

import type { CodeEditorContainerProps } from "./code-editor.types";

// ==============================
// Container Component
// ==============================

/**
 * CodeEditor 容器组件
 *
 * 职责：
 * - 从数据库加载代码内容
 * - 管理编辑器状态（代码、加载状态）
 * - 使用 useUnifiedSave hook 统一保存逻辑
 * - 支持 Ctrl+S 快捷键立即保存
 */
export const CodeEditorContainer = memo(function CodeEditorContainer({
	nodeId,
	className,
}: CodeEditorContainerProps) {
	const { isDark } = useTheme();

	// ==============================
	// Store 连接
	// ==============================

	// 获取当前活动 tab（用于获取文件名和同步 isDirty 状态）
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
	// 统一保存逻辑（使用 useUnifiedSave hook）
	// ==============================

	const { updateContent, saveNow, hasUnsavedChanges, setInitialContent } =
		useUnifiedSave({
			nodeId,
			contentType: "text",
			tabId: activeTabId ?? undefined,
			registerShortcut: false, // CodeEditor 有自己的快捷键处理（Monaco 内置）
			onSaveSuccess: () => {
				logger.success("[CodeEditor] 内容保存成功");
			},
			onSaveError: (error) => {
				logger.error("[CodeEditor] 保存内容失败:", error);
				toast.error("Failed to save code");
			},
		});

	// ==============================
	// 加载内容
	// ==============================

	useEffect(() => {
		const loadContent = async () => {
			logger.info("[CodeEditor] 加载内容:", nodeId);

			const result = await getContentByNodeId(nodeId)();

			if (E.isRight(result)) {
				const content = result.right;
				if (content) {
					setCode(content.content);
					setInitialContent(content.content);
					logger.success("[CodeEditor] 内容加载成功");
				} else {
					logger.info("[CodeEditor] 内容为空，使用默认值");
				}
			} else {
				logger.error("[CodeEditor] 加载内容失败:", result.left);
				toast.error("Failed to load code content");
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

	/**
	 * 手动保存处理器 (Ctrl+S)
	 */
	const handleManualSave = useCallback(async () => {
		if (!hasUnsavedChanges()) {
			toast.info("No changes to save");
			return;
		}

		logger.info("[CodeEditor] 手动保存触发");
		await saveNow();
	}, [hasUnsavedChanges, saveNow]);

	// ==============================
	// 语言检测
	// ==============================

	const language = getMonacoLanguage(activeTab?.title ?? "code.js");

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
			<CodeEditorView
				code={code}
				language={language as Parameters<typeof CodeEditorView>[0]["language"]}
				theme={isDark ? "dark" : "light"}
				onCodeChange={handleCodeChange}
				onSave={handleManualSave}
			/>
		</div>
	);
});
