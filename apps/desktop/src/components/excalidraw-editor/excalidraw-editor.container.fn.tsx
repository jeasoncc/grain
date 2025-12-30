/**
 * Excalidraw 编辑器组件 - Container
 *
 * 容器组件：连接 hooks/stores，处理数据加载和保存逻辑
 * 支持 Ctrl+S 快捷键立即保存
 *
 * 性能优化：
 * - 使用 refs 存储非渲染数据（currentDataRef, hasUnsavedChanges）
 * - onChange 回调不触发组件重渲染
 * - 状态更新使用节流控制
 * - ResizeObserver 使用防抖和阈值过滤
 *
 * @requirements 2.1, 3.1, 3.2, 4.1, 4.2, 5.2, 5.4, 7.4
 */

import { debounce, throttle } from "es-toolkit";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { updateContentByNodeId } from "@/db/content.db.fn";
import { useContentByNodeId } from "@/hooks/use-content";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import logger from "@/log";
import { useSaveStore } from "@/stores/save.store";
import { EXCALIDRAW_PERFORMANCE_CONFIG } from "./excalidraw-editor.config";
import type {
	ContainerSize,
	ExcalidrawEditorContainerProps,
} from "./excalidraw-editor.types";
import { ExcalidrawEditorView } from "./excalidraw-editor.view.fn";

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

		// 追踪上一个 nodeId，用于检测 nodeId 变化
		const prevNodeIdRef = useRef<string | null>(null);

		/**
		 * 解析内容并设置初始数据
		 *
		 * 性能优化：
		 * - 使用 isInitializedRef 确保 parseExcalidrawContent 只在初始化时调用一次
		 * - 当 nodeId 变化时，重置 isInitializedRef 以允许重新解析
		 *
		 * @requirements 2.4
		 */
		useEffect(() => {
			// 检测 nodeId 是否变化
			const nodeIdChanged = prevNodeIdRef.current !== null && prevNodeIdRef.current !== nodeId;

			// 如果 nodeId 变化，重置状态
			if (nodeIdChanged) {
				logger.info("[ExcalidrawEditor] nodeId 变化，重置状态:", {
					from: prevNodeIdRef.current,
					to: nodeId,
				});
				isInitializedRef.current = false;
				sizeStableRef.current = false;
				setInitialData(null);
				setContainerSize(null);
			}

			// 更新 prevNodeIdRef
			prevNodeIdRef.current = nodeId;

			// 只有在未初始化且 content 已加载时才解析内容
			if (content !== undefined && !isInitializedRef.current) {
				const parsed = parseExcalidrawContent(content?.content);
				setInitialData(parsed);
				isInitializedRef.current = true;
				logger.info("[ExcalidrawEditor] 初始化数据:", parsed);
			}
		}, [content, nodeId]);

		// 监听容器尺寸 - 使用防抖确保尺寸稳定
		// @requirements 4.1, 4.2
		useEffect(() => {
			const container = containerRef.current;
			if (!container) return;

			const {
				RESIZE_DEBOUNCE_DELAY,
				SIZE_CHANGE_THRESHOLD,
				MIN_VALID_SIZE,
				INITIAL_LAYOUT_DELAY,
			} = EXCALIDRAW_PERFORMANCE_CONFIG;

			let resizeTimeout: NodeJS.Timeout | null = null;
			let lastWidth = 0;
			let lastHeight = 0;

			const updateSize = () => {
				const rect = container.getBoundingClientRect();
				const width = Math.floor(rect.width);
				const height = Math.floor(rect.height);

				// 只有当尺寸有效且变化超过阈值时才更新
				if (width > MIN_VALID_SIZE && height > MIN_VALID_SIZE) {
					const widthChanged = Math.abs(width - lastWidth) > SIZE_CHANGE_THRESHOLD;
					const heightChanged = Math.abs(height - lastHeight) > SIZE_CHANGE_THRESHOLD;

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
						}, RESIZE_DEBOUNCE_DELAY);
					}
				}
			};

			// 初始延迟，等待布局稳定
			const initialTimeout = setTimeout(updateSize, INITIAL_LAYOUT_DELAY);

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

		/**
		 * 节流的状态更新函数，避免频繁更新 store
		 *
		 * 使用 useMemo 确保节流函数在组件生命周期内保持稳定
		 * 包装 markAsUnsaved, markAsSaving, markAsSaved 调用
		 *
		 * @requirements 3.3, 3.4
		 */
		const throttledMarkAsUnsaved = useMemo(
			() =>
				throttle(
					markAsUnsaved,
					EXCALIDRAW_PERFORMANCE_CONFIG.STATUS_UPDATE_THROTTLE,
				),
			[markAsUnsaved],
		);

		const throttledMarkAsSaving = useMemo(
			() =>
				throttle(
					markAsSaving,
					EXCALIDRAW_PERFORMANCE_CONFIG.STATUS_UPDATE_THROTTLE,
				),
			[markAsSaving],
		);

		const throttledMarkAsSaved = useMemo(
			() =>
				throttle(
					markAsSaved,
					EXCALIDRAW_PERFORMANCE_CONFIG.STATUS_UPDATE_THROTTLE,
				),
			[markAsSaved],
		);

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

				throttledMarkAsSaving();

				const result = await updateContentByNodeId(
					nodeId,
					JSON.stringify(dataToSave),
					"excalidraw",
				)();

				if (result._tag === "Right") {
					throttledMarkAsSaved();
					logger.debug("[ExcalidrawEditor] 内容已保存");
				} else {
					markAsError(result.left.message || "保存失败");
					logger.error("[ExcalidrawEditor] 保存失败:", result.left);
				}
			},
			[nodeId, throttledMarkAsSaving, throttledMarkAsSaved, markAsError],
		);

		const debouncedSave = useMemo(
			() =>
				debounce(saveContent, EXCALIDRAW_PERFORMANCE_CONFIG.AUTO_SAVE_DELAY),
			[saveContent],
		);

		/**
		 * onChange 回调处理器
		 *
		 * 性能优化：
		 * - 使用 refs 存储数据，不触发组件重渲染
		 * - 使用节流的 markAsUnsaved，减少 store 更新频率
		 *
		 * @requirements 2.1, 3.1, 3.2
		 */
		const handleChange = useCallback(
			(
				elements: readonly unknown[],
				appState: Record<string, unknown>,
				files: Record<string, unknown>,
			) => {
				// 保存当前数据引用（用于手动保存和卸载时保存）
				// 使用 ref 不触发重渲染
				currentDataRef.current = { elements, appState, files };
				hasUnsavedChanges.current = true;

				// 使用节流的状态更新，减少 store 更新频率
				throttledMarkAsUnsaved();

				// 防抖保存
				debouncedSave(elements, appState, files);
			},
			[debouncedSave, throttledMarkAsUnsaved],
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
				// 取消防抖和节流
				debouncedSave.cancel();
				throttledMarkAsUnsaved.cancel();
				throttledMarkAsSaving.cancel();
				throttledMarkAsSaved.cancel();

				// 组件卸载时，如果有未保存的更改，立即保存
				const data = currentDataRef.current;
				if (data && hasUnsavedChanges.current) {
					logger.info("[ExcalidrawEditor] 组件卸载，保存未保存的更改");
					saveContent(data.elements, data.appState, data.files);
				}
			};
		}, [debouncedSave, throttledMarkAsUnsaved, throttledMarkAsSaving, throttledMarkAsSaved, saveContent]);

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
