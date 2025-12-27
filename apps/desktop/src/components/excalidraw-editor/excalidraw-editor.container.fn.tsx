/**
 * Excalidraw 编辑器组件 - Container
 *
 * 容器组件：连接 hooks/stores，处理数据加载和保存逻辑
 * - 从路由获取 nodeId
 * - 使用 useContentByNodeId hook 获取内容数据
 * - 解析 Excalidraw JSON
 * - 实现自动保存逻辑（debounced）
 * - 使用 ResizeObserver 确保容器有有效尺寸后再渲染 Excalidraw
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

/** 最小有效容器尺寸 */
const MIN_CONTAINER_SIZE = 100;

/** 
 * 最大安全容器尺寸
 * 浏览器 canvas 最大尺寸约为 16384x16384 像素
 * 考虑 devicePixelRatio (最高可达 3-4)，我们限制为 4000px
 * 这样即使 DPR=4，实际 canvas 也只有 16000px
 */
const MAX_CONTAINER_SIZE = 4000;

/** Excalidraw 初始数据类型 */
interface ExcalidrawInitialData {
	readonly elements: readonly unknown[];
	readonly appState: Record<string, unknown>;
	readonly files: Record<string, unknown>;
}

/** 默认空 Excalidraw 数据 - 只包含最小必要属性 */
const EMPTY_EXCALIDRAW_DATA: ExcalidrawInitialData = {
	elements: [],
	appState: {
		viewBackgroundColor: "#ffffff",
	},
	files: {},
};

/**
 * 检查容器尺寸是否有效
 * 考虑 devicePixelRatio，确保实际 canvas 尺寸不超过浏览器限制
 */
function isValidContainerSize(size: ContainerSize): boolean {
	const dpr = Math.min(window.devicePixelRatio || 1, 2); // 限制 DPR 最大为 2
	const maxSize = Math.floor(MAX_CONTAINER_SIZE / dpr);
	
	return (
		size.width >= MIN_CONTAINER_SIZE &&
		size.height >= MIN_CONTAINER_SIZE &&
		size.width <= maxSize &&
		size.height <= maxSize &&
		Number.isFinite(size.width) &&
		Number.isFinite(size.height)
	);
}

/**
 * 限制容器尺寸在安全范围内
 */
function clampContainerSize(size: ContainerSize): ContainerSize {
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	const maxSize = Math.floor(MAX_CONTAINER_SIZE / dpr);
	
	return {
		width: Math.min(Math.max(size.width, MIN_CONTAINER_SIZE), maxSize),
		height: Math.min(Math.max(size.height, MIN_CONTAINER_SIZE), maxSize),
	};
}

/**
 * 解析 Excalidraw JSON 内容
 * 只保留安全的 appState 属性，避免 Canvas exceeds max size 错误
 */
function parseExcalidrawContent(
	content: string | undefined,
): ExcalidrawInitialData {
	if (!content) {
		return EMPTY_EXCALIDRAW_DATA;
	}

	try {
		const parsed = JSON.parse(content);

		// 只保留安全的 appState 属性
		const safeAppState: Record<string, unknown> = {
			viewBackgroundColor: "#ffffff",
		};

		if (parsed.appState?.viewBackgroundColor) {
			safeAppState.viewBackgroundColor = parsed.appState.viewBackgroundColor;
		}

		return {
			elements: Array.isArray(parsed.elements) ? parsed.elements : [],
			appState: safeAppState,
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
		const [initialData, setInitialData] =
			useState<ExcalidrawInitialData | null>(null);

		// 是否已初始化（防止重复设置初始数据）
		const isInitializedRef = useRef(false);

		// 容器尺寸状态
		const [containerSize, setContainerSize] = useState<ContainerSize | null>(
			null,
		);

		// 解析内容并设置初始数据
		useEffect(() => {
			if (content !== undefined && !isInitializedRef.current) {
				const parsed = parseExcalidrawContent(content?.content);
				setInitialData(parsed);
				isInitializedRef.current = true;
				logger.info("[ExcalidrawEditor] 初始化数据:", parsed);
			}
		}, [content, nodeId]);

		// 当 nodeId 变化时重置初始化状态
		useEffect(() => {
			isInitializedRef.current = false;
			setInitialData(null);
			setContainerSize(null);
		}, [nodeId]);

		// 使用 ResizeObserver 监听容器尺寸变化
		useEffect(() => {
			const container = containerRef.current;
			if (!container) return;

			const updateSize = () => {
				const rect = container.getBoundingClientRect();
				const rawSize: ContainerSize = {
					width: Math.floor(rect.width),
					height: Math.floor(rect.height),
				};

				// 限制尺寸在安全范围内
				const clampedSize = clampContainerSize(rawSize);
				
				if (isValidContainerSize(clampedSize)) {
					setContainerSize(clampedSize);
					logger.debug("[ExcalidrawEditor] 容器尺寸:", clampedSize);
				}
			};

			// 初始检查
			updateSize();

			// 监听尺寸变化
			const resizeObserver = new ResizeObserver(() => {
				updateSize();
			});

			resizeObserver.observe(container);

			return () => {
				resizeObserver.disconnect();
			};
		}, [initialData]);

		// 保存内容到数据库
		const saveContent = useCallback(
			async (
				elements: readonly unknown[],
				appState: Record<string, unknown>,
				files: Record<string, unknown>,
			) => {
				// 只保存安全的 appState 属性
				const dataToSave = {
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

		// 是否可以渲染 Excalidraw
		const canRenderExcalidraw =
			initialData !== null && containerSize !== null;

		// 内容加载中
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

		return (
			<div
				ref={containerRef}
				className={cn("flex flex-col", className)}
				style={{
					// 使用 flex: 1 让容器填充父元素
					flex: 1,
					// 确保最小尺寸
					minHeight: 0,
					minWidth: 0,
					overflow: "hidden",
				}}
			>
				{canRenderExcalidraw ? (
					<ExcalidrawEditorView
						key={`${nodeId}-${containerSize.width}-${containerSize.height}`}
						initialData={initialData}
						theme={isDark ? "dark" : "light"}
						onChange={handleChange}
						containerSize={containerSize}
					/>
				) : (
					<div className="flex items-center justify-center flex-1 text-muted-foreground">
						<span>Preparing canvas...</span>
					</div>
				)}
			</div>
		);
	},
);

ExcalidrawEditorContainer.displayName = "ExcalidrawEditorContainer";
