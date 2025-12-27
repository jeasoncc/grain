/**
 * Excalidraw 编辑器组件 - Container
 *
 * 容器组件：连接 hooks/stores，处理数据加载和保存逻辑
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
import type { ContainerSize, ExcalidrawEditorContainerProps } from "./excalidraw-editor.types";
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
	appState: {
		viewBackgroundColor: "#ffffff",
		scrollX: 0,
		scrollY: 0,
		zoom: { value: 1 },
	},
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
			elements: Array.isArray(parsed.elements) ? parsed.elements : [],
			appState: {
				viewBackgroundColor: parsed.appState?.viewBackgroundColor || "#ffffff",
				scrollX: 0,
				scrollY: 0,
				zoom: { value: 1 },
			},
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
		const containerRef = useRef<HTMLDivElement>(null);

		// 初始数据状态
		const [initialData, setInitialData] = useState<ExcalidrawInitialData | null>(null);
		const isInitializedRef = useRef(false);

		// 容器尺寸状态
		const [containerSize, setContainerSize] = useState<ContainerSize | null>(null);

		// 解析内容并设置初始数据
		useEffect(() => {
			if (content !== undefined && !isInitializedRef.current) {
				const parsed = parseExcalidrawContent(content?.content);
				setInitialData(parsed);
				isInitializedRef.current = true;
				logger.info("[ExcalidrawEditor] 初始化数据:", parsed);
			}
		}, [content]);

		// 当 nodeId 变化时重置
		useEffect(() => {
			isInitializedRef.current = false;
			setInitialData(null);
			setContainerSize(null);
		}, [nodeId]);

		// 监听容器尺寸
		useEffect(() => {
			const container = containerRef.current;
			if (!container) return;

			const updateSize = () => {
				const rect = container.getBoundingClientRect();
				const width = Math.floor(rect.width);
				const height = Math.floor(rect.height);
				
				if (width > 100 && height > 100) {
					setContainerSize({ width, height });
				}
			};

			updateSize();

			const resizeObserver = new ResizeObserver(updateSize);
			resizeObserver.observe(container);

			return () => resizeObserver.disconnect();
		}, []);

		// 保存内容
		const saveContent = useCallback(
			async (
				elements: readonly unknown[],
				appState: Record<string, unknown>,
				files: Record<string, unknown>,
			) => {
				const dataToSave = {
					type: "excalidraw",
					version: 2,
					source: "grain-editor",
					elements,
					appState: {
						viewBackgroundColor: appState.viewBackgroundColor || "#ffffff",
					},
					files,
				};

				const result = await updateContentByNodeId(
					nodeId,
					JSON.stringify(dataToSave),
					"excalidraw",
				)();

				if (result._tag === "Right") {
					logger.debug("[ExcalidrawEditor] 内容已保存");
				} else {
					logger.error("[ExcalidrawEditor] 保存失败:", result.left);
				}
			},
			[nodeId],
		);

		const debouncedSave = useMemo(
			() => debounce(saveContent, AUTO_SAVE_DELAY),
			[saveContent],
		);

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

		useEffect(() => {
			return () => debouncedSave.cancel();
		}, [debouncedSave]);

		// 加载中
		if (content === undefined) {
			return (
				<div
					ref={containerRef}
					className={cn("flex items-center justify-center h-full w-full text-muted-foreground", className)}
				>
					<span>Loading...</span>
				</div>
			);
		}

		// 等待尺寸和数据
		if (!containerSize || !initialData) {
			return (
				<div
					ref={containerRef}
					className={cn("flex items-center justify-center h-full w-full text-muted-foreground", className)}
				>
					<span>Preparing canvas...</span>
				</div>
			);
		}

		return (
			<div
				ref={containerRef}
				className={cn("h-full w-full", className)}
			>
				<ExcalidrawEditorView
					key={nodeId}
					initialData={initialData}
					theme={isDark ? "dark" : "light"}
					onChange={handleChange}
					containerSize={containerSize}
				/>
			</div>
		);
	},
);

ExcalidrawEditorContainer.displayName = "ExcalidrawEditorContainer";
