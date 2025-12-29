/**
 * Excalidraw 编辑器组件 - Container
 *
 * 容器组件：连接 hooks/stores，处理数据加载和保存逻辑
 * 支持 Ctrl+S 快捷键立即保存
 *
 * @requirements 5.2, 5.4, 7.4
 */

import { debounce } from "es-toolkit";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { updateContentByNodeId } from "@/db/content.db.fn";
import { useContentByNodeId } from "@/hooks/use-content";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import logger from "@/log";
import { useSaveStore } from "@/stores/save.store";
import type {
	ContainerSize,
	ExcalidrawEditorContainerProps,
} from "./excalidraw-editor.types";
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

		// 保存状态管理
		const { markAsUnsaved, markAsSaving, markAsSaved, markAsError } =
			useSaveStore();

		// 初始数据状态
		const [initialData, setInitialData] =
			useState<ExcalidrawInitialData | null>(null);
		const isInitializedRef = useRef(false);

		// 当前数据引用（用于手动保存和卸载时保存）
		const currentDataRef = useRef<{
			elements: readonly unknown[];
			appState: Record<string, unknown>;
			files: Record<string, unknown>;
		} | null>(null);

		// 用于追踪是否有未保存的更改
		const hasUnsavedChanges = useRef(false);

		// 容器尺寸状态 - 使用稳定的尺寸
		const [containerSize, setContainerSize] = useState<ContainerSize | null>(
			null,
		);
		const sizeStableRef = useRef(false);

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
			sizeStableRef.current = false;
			setInitialData(null);
			setContainerSize(null);
		}, []);

		// 监听容器尺寸 - 使用防抖确保尺寸稳定
		useEffect(() => {
			const container = containerRef.current;
			if (!container) return;

			let resizeTimeout: NodeJS.Timeout | null = null;
			let lastWidth = 0;
			let lastHeight = 0;

			const updateSize = () => {
				const rect = container.getBoundingClientRect();
				const width = Math.floor(rect.width);
				const height = Math.floor(rect.height);

				// 只有当尺寸有效且变化超过阈值时才更新
				if (width > 200 && height > 200) {
					const widthChanged = Math.abs(width - lastWidth) > 10;
					const heightChanged = Math.abs(height - lastHeight) > 10;

					if (!sizeStableRef.current || widthChanged || heightChanged) {
						lastWidth = width;
						lastHeight = height;

						// 使用防抖，等待尺寸稳定
						if (resizeTimeout) {
							clearTimeout(resizeTimeout);
						}

						resizeTimeout = setTimeout(() => {
							setContainerSize({ width, height });
							sizeStableRef.current = true;
							logger.info("[ExcalidrawEditor] 容器尺寸:", { width, height });
						}, 150);
					}
				}
			};

			// 初始延迟，等待布局稳定
			const initialTimeout = setTimeout(updateSize, 100);

			const resizeObserver = new ResizeObserver(() => {
				// 只有在尺寸已经稳定后才响应 resize
				if (sizeStableRef.current) {
					updateSize();
				}
			});
			resizeObserver.observe(container);

			return () => {
				clearTimeout(initialTimeout);
				if (resizeTimeout) {
					clearTimeout(resizeTimeout);
				}
				resizeObserver.disconnect();
			};
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

				markAsSaving();

				const result = await updateContentByNodeId(
					nodeId,
					JSON.stringify(dataToSave),
					"excalidraw",
				)();

				if (result._tag === "Right") {
					markAsSaved();
					logger.debug("[ExcalidrawEditor] 内容已保存");
				} else {
					markAsError(result.left.message || "保存失败");
					logger.error("[ExcalidrawEditor] 保存失败:", result.left);
				}
			},
			[nodeId, markAsSaving, markAsSaved, markAsError],
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
				// 保存当前数据引用（用于手动保存和卸载时保存）
				currentDataRef.current = { elements, appState, files };
				hasUnsavedChanges.current = true;
				markAsUnsaved();
				debouncedSave(elements, appState, files);
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

			const data = currentDataRef.current;
			if (!data || !hasUnsavedChanges.current) {
				toast.info("No changes to save");
				return;
			}

			logger.info("[ExcalidrawEditor] 手动保存触发");
			await saveContent(data.elements, data.appState, data.files);
			hasUnsavedChanges.current = false;
		}, [debouncedSave, saveContent]);

		// 清理：组件卸载时保存未保存的更改
		useEffect(() => {
			return () => {
				// 取消防抖
				debouncedSave.cancel();

				// 组件卸载时，如果有未保存的更改，立即保存
				const data = currentDataRef.current;
				if (data && hasUnsavedChanges.current) {
					logger.info("[ExcalidrawEditor] 组件卸载，保存未保存的更改");
					saveContent(data.elements, data.appState, data.files);
				}
			};
		}, [debouncedSave, saveContent]);

		// 加载中
		if (content === undefined) {
			return (
				<div
					ref={containerRef}
					className={cn(
						"flex items-center justify-center h-full w-full text-muted-foreground",
						className,
					)}
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
					className={cn(
						"flex items-center justify-center h-full w-full text-muted-foreground",
						className,
					)}
				>
					<span>Preparing canvas...</span>
				</div>
			);
		}

		return (
			<div ref={containerRef} className={cn("h-full w-full", className)}>
				<ExcalidrawEditorView
					key={nodeId}
					initialData={initialData}
					theme={isDark ? "dark" : "light"}
					onChange={handleChange}
					onSave={handleManualSave}
					containerSize={containerSize}
				/>
			</div>
		);
	},
);

ExcalidrawEditorContainer.displayName = "ExcalidrawEditorContainer";
