/**
 * @file code-editor.container.fn.tsx
 * @description CodeEditor 容器组件
 *
 * 负责数据获取、状态管理和业务逻辑。
 * 将数据通过 props 传递给纯展示组件 CodeEditorView。
 * 支持 Ctrl+S 快捷键立即保存。
 *
 * 数据流：
 * 用户输入 → CodeEditorView → onChange → 防抖保存 → DB → SaveStore → UI 反馈
 *
 * @requirements 2.5, 3.1, 3.2, 3.3, 3.4
 */

import { debounce } from "es-toolkit";
import * as E from "fp-ts/Either";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { getContentByNodeId, updateContentByNodeId } from "@/db";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import logger from "@/log";
import { useSaveStore } from "@/stores/save.store";

import type { CodeEditorContainerProps } from "./code-editor.types";
import { CodeEditorView } from "./code-editor.view.fn";

// ==============================
// Constants
// ==============================

/** 自动保存防抖延迟（毫秒） */
const AUTOSAVE_DEBOUNCE_MS = 1000;

// ==============================
// Container Component
// ==============================

/**
 * CodeEditor 容器组件
 *
 * 职责：
 * - 从数据库加载代码内容
 * - 管理编辑器状态（代码内容）
 * - 自动保存内容到数据库（防抖）
 * - 支持 Ctrl+S 快捷键立即保存
 * - 组件卸载时保存未保存的更改
 *
 * @example
 * ```tsx
 * <CodeEditorContainer
 *   nodeId="node-123"
 *   language="mermaid"
 *   className="h-full"
 * />
 * ```
 */
export const CodeEditorContainer = memo(function CodeEditorContainer({
	nodeId,
	language,
	className,
}: CodeEditorContainerProps) {
	const { isDark } = useTheme();

	// ==============================
	// Store 连接
	// ==============================

	const { markAsUnsaved, markAsSaving, markAsSaved, markAsError } =
		useSaveStore();

	// ==============================
	// 本地状态
	// ==============================

	const [code, setCode] = useState("");
	const [isInitialized, setIsInitialized] = useState(false);

	// 用于追踪是否有未保存的更改
	const hasUnsavedChanges = useRef(false);
	const lastSavedCode = useRef("");

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
					lastSavedCode.current = content.content;
					logger.success("[CodeEditor] 内容加载成功");
				} else {
					logger.info("[CodeEditor] 内容为空，使用默认值");
				}
			} else {
				logger.error("[CodeEditor] 加载内容失败:", result.left);
				toast.error("加载内容失败");
			}

			setIsInitialized(true);
		};

		loadContent();
	}, [nodeId]);

	// ==============================
	// 保存内容
	// ==============================

	const saveContent = useCallback(
		async (newCode: string) => {
			if (newCode === lastSavedCode.current) {
				return;
			}

			logger.info("[CodeEditor] 保存内容:", nodeId);
			markAsSaving();

			// 代码内容使用 "text" 类型存储
			const result = await updateContentByNodeId(nodeId, newCode, "text")();

			if (E.isRight(result)) {
				lastSavedCode.current = newCode;
				hasUnsavedChanges.current = false;
				markAsSaved();
				logger.success("[CodeEditor] 内容保存成功");
			} else {
				markAsError(result.left.message || "保存失败");
				logger.error("[CodeEditor] 保存内容失败:", result.left);
				toast.error("保存失败");
			}
		},
		[nodeId, markAsSaving, markAsSaved, markAsError],
	);

	// 防抖保存
	const debouncedSave = useMemo(
		() => debounce(saveContent, AUTOSAVE_DEBOUNCE_MS),
		[saveContent],
	);

	// ==============================
	// 代码变化处理
	// ==============================

	const handleCodeChange = useCallback(
		(newCode: string) => {
			setCode(newCode);
			hasUnsavedChanges.current = true;
			markAsUnsaved();

			// 防抖保存
			debouncedSave(newCode);
		},
		[debouncedSave, markAsUnsaved],
	);

	/**
	 * 手动保存处理器 (Ctrl+S)
	 * 取消防抖，立即保存当前内容
	 */
	const handleManualSave = useCallback(async () => {
		// 取消防抖的自动保存
		debouncedSave.cancel();

		if (!hasUnsavedChanges.current && code === lastSavedCode.current) {
			toast.info("没有需要保存的更改");
			return;
		}

		logger.info("[CodeEditor] 手动保存触发");
		await saveContent(code);
	}, [debouncedSave, code, saveContent]);

	// ==============================
	// 清理
	// ==============================

	useEffect(() => {
		return () => {
			// 组件卸载时，如果有未保存的更改，立即保存
			if (hasUnsavedChanges.current) {
				saveContent(code);
			}
			// 取消防抖
			debouncedSave.cancel();
		};
	}, [code, saveContent, debouncedSave]);

	// ==============================
	// 渲染
	// ==============================

	// 加载中状态
	if (!isInitialized) {
		return (
			<div
				className={cn(
					"flex h-full w-full items-center justify-center text-muted-foreground",
					className,
				)}
			>
				加载中...
			</div>
		);
	}

	return (
		<div className={cn("h-full w-full", className)}>
			<CodeEditorView
				value={code}
				language={language}
				theme={isDark ? "dark" : "light"}
				onChange={handleCodeChange}
				onSave={handleManualSave}
			/>
		</div>
	);
});
