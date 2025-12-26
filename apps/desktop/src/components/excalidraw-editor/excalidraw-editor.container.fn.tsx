/**
 * Excalidraw 编辑器组件 - Container
 *
 * 容器组件：连接 hooks/stores，处理数据加载和保存逻辑
 * - 从路由获取 nodeId
 * - 使用 useContentByNodeId hook 获取内容数据
 * - 解析 Excalidraw JSON
 * - 实现自动保存逻辑（debounced）
 *
 * @requirements 5.2, 5.4
 */

import { debounce } from "es-toolkit";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { updateContentByNodeId } from "@/db/content.db.fn";
import { useContentByNodeId } from "@/hooks/use-content";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import logger from "@/log";
import type { ExcalidrawEditorContainerProps } from "./excalidraw-editor.types";
import { ExcalidrawEditorView } from "./excalidraw-editor.view.fn";

/** 自动保存延迟时间（毫秒） */
const AUTO_SAVE_DELAY = 2000;

/** Excalidraw 初始数据类型 */
interface ExcalidrawInitialData {
	readonly elements: readonly unknown[];
	readonly appState: Record<string, unknown>;
	readonly files: Record<string, unknown>;
}

/** 默认空 Excalidraw 数据 */
const EMPTY_EXCALIDRAW_DATA: ExcalidrawInitialData = {
	elements: [],
	appState: {},
	files: {},
};

/**
 * 解析 Excalidraw JSON 内容
 */
function parseExcalidrawContent(
	content: string | undefined,
): ExcalidrawInitialData {
	if (!content) {
		return EMPTY_EXCALIDRAW_DATA;
	}

	try {
		const parsed = JSON.parse(content);
		return {
			elements: parsed.elements || [],
			appState: parsed.appState || {},
			files: parsed.files || {},
		};
	} catch (error) {
		logger.error("[ExcalidrawEditor] 解析内容失败:", error);
		return EMPTY_EXCALIDRAW_DATA;
	}
}

export const ExcalidrawEditorContainer = memo(
	({ nodeId, className }: ExcalidrawEditorContainerProps) => {
		const content = useContentByNodeId(nodeId);
		const { isDark } = useTheme();

		// 初始数据状态
		const [initialData, setInitialData] =
			useState<ExcalidrawInitialData | null>(null);

		// 是否已初始化（防止重复设置初始数据）
		const isInitializedRef = useRef(false);

		// 解析内容并设置初始数据
		useEffect(() => {
			if (content !== undefined && !isInitializedRef.current) {
				const parsed = parseExcalidrawContent(content?.content);
				setInitialData(parsed);
				isInitializedRef.current = true;
				logger.info("[ExcalidrawEditor] 初始化数据:", {
					nodeId,
					elementsCount: parsed.elements?.length || 0,
				});
			}
		}, [content, nodeId]);

		// 当 nodeId 变化时重置初始化状态
		useEffect(() => {
			isInitializedRef.current = false;
			setInitialData(null);
		}, [nodeId]);

		// 保存内容到数据库
		const saveContent = useCallback(
			async (
				elements: readonly unknown[],
				appState: Record<string, unknown>,
				files: Record<string, unknown>,
			) => {
				const dataToSave = {
					elements,
					appState: {
						viewBackgroundColor: appState.viewBackgroundColor,
						gridSize: appState.gridSize,
					},
					files,
				};

				const result = await updateContentByNodeId(
					nodeId,
					JSON.stringify(dataToSave),
					"excalidraw",
				)();

				if (result._tag === "Right") {
					logger.debug("[ExcalidrawEditor] 内容已保存:", nodeId);
				} else {
					logger.error("[ExcalidrawEditor] 保存失败:", result.left);
				}
			},
			[nodeId],
		);

		// 防抖保存函数
		const debouncedSave = useMemo(
			() => debounce(saveContent, AUTO_SAVE_DELAY),
			[saveContent],
		);

		// 内容变化处理
		const handleChange = useCallback(
			(
				elements: readonly unknown[],
				appState: Record<string, unknown>,
				files: Record<string, unknown>,
			) => {
				debouncedSave(elements, appState, files);
			},
			[debouncedSave],
		);

		// 组件卸载时取消防抖
		useEffect(() => {
			return () => {
				debouncedSave.cancel();
			};
		}, [debouncedSave]);

		// 内容加载中
		if (content === undefined) {
			return (
				<div
					className={cn(
						"flex items-center justify-center h-full text-muted-foreground",
						className,
					)}
				>
					<span>Loading...</span>
				</div>
			);
		}

		return (
			<ExcalidrawEditorView
				initialData={initialData}
				theme={isDark ? "dark" : "light"}
				onChange={handleChange}
				className={className}
			/>
		);
	},
);

ExcalidrawEditorContainer.displayName = "ExcalidrawEditorContainer";
