/**
 * Excalidraw 编辑器组件 - Container
 *
 * 容器组件：连接 hooks/stores，处理数据加载和保存逻辑
 * 支持 Ctrl+S 快捷键立即保存
 *
 * 使用 useUnifiedSave hook 统一保存逻辑，与其他编辑器保持一致
 * 自动保存和手动保存都通过同一个 hook 处理
 *
 * 性能优化：
 * - 使用 refs 存储非渲染数据（currentDataRef）
 * - onChange 回调不触发组件重渲染
 * - ResizeObserver 使用防抖和阈值过滤
 *
 * @requirements 2.1, 3.1, 3.2, 4.1, 4.2, 5.2, 5.4, 7.1, 7.2, 7.3, 7.4
 */

import { memo, useCallback, useEffect, useRef, useState } from "react"
import { saveServiceManager } from "@/flows/save"
import { useContentByNodeId } from "@/hooks/use-content"
import { useTheme } from "@/hooks/use-theme"
import { useUnifiedSave } from "@/hooks/use-unified-save"
import { useEditorTabsStore } from "@/state/editor-tabs.state"
import { cn } from "@/utils/cn.util"
import { EXCALIDRAW_PERFORMANCE_CONFIG } from "./excalidraw-editor.config"
import type { ContainerSize, ExcalidrawEditorContainerProps } from "./excalidraw-editor.types"
import { getHardwareAccelerationStatus } from "./excalidraw-editor.utils"
import { ExcalidrawEditorView } from "./excalidraw-editor.view.fn"

/** Excalidraw 初始数据类型 */
interface ExcalidrawInitialData {
	readonly elements: readonly unknown[]
	readonly appState: Record<string, unknown>
	readonly files: Record<string, unknown>
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
}

/**
 * 解析 Excalidraw JSON 内容
 */
function parseExcalidrawContent(content: string | undefined): ExcalidrawInitialData {
	if (!content) {
		return EMPTY_EXCALIDRAW_DATA
	}

	try {
		const parsed = JSON.parse(content)
		return {
			elements: Array.isArray(parsed.elements) ? parsed.elements : [],
			appState: {
				viewBackgroundColor: parsed.appState?.viewBackgroundColor || "#ffffff",
				scrollX: 0,
				scrollY: 0,
				zoom: { value: 1 },
			},
			files: parsed.files || {},
		}
	} catch (error) {
		console.error("[ExcalidrawEditor] 解析内容失败:", error)
		return EMPTY_EXCALIDRAW_DATA
	}
}

/**
 * 序列化 Excalidraw 数据为 JSON 字符串
 */
function serializeExcalidrawData(
	elements: readonly unknown[],
	appState: Record<string, unknown>,
	files: Record<string, unknown>,
): string {
	const dataToSave = {
		type: "excalidraw",
		version: 2,
		source: "grain-editor",
		elements,
		appState: {
			viewBackgroundColor: appState.viewBackgroundColor || "#ffffff",
		},
		files,
	}
	return JSON.stringify(dataToSave)
}

export const ExcalidrawEditorContainer = memo(
	({ nodeId, className }: ExcalidrawEditorContainerProps) => {
		const content = useContentByNodeId(nodeId)
		const { isDark } = useTheme()
		const containerRef = useRef<HTMLDivElement>(null)

		// 获取当前活动 tab ID（用于同步 isDirty 状态）
		const activeTabId = useEditorTabsStore((s) => s.activeTabId)

		// 初始数据状态
		const [initialData, setInitialData] = useState<ExcalidrawInitialData | null>(null)
		const isInitializedRef = useRef(false)

		// 当前数据引用（用于手动保存）
		const currentDataRef = useRef<{
			elements: readonly unknown[]
			appState: Record<string, unknown>
			files: Record<string, unknown>
		} | null>(null)

		// 容器尺寸状态 - 使用稳定的尺寸
		const [containerSize, setContainerSize] = useState<ContainerSize | null>(null)
		const sizeStableRef = useRef(false)

		// 追踪上一个 nodeId，用于检测 nodeId 变化
		const prevNodeIdRef = useRef<string | null>(null)

		// ==============================
		// 统一保存逻辑（使用 useUnifiedSave hook）
		// 自动保存和手动保存（Ctrl+S）都通过同一个 hook 处理
		// ==============================

		const { updateContent, saveNow, setInitialContent } = useUnifiedSave({
			nodeId,
			contentType: "excalidraw",
			tabId: activeTabId ?? undefined,
			registerShortcut: false, // Excalidraw 有自己的快捷键处理
			onSaveSuccess: () => {
				console.log("[ExcalidrawEditor] 内容保存成功")
			},
			onSaveError: (error) => {
				console.error("[ExcalidrawEditor] 保存失败:", error)
			},
		})

		/**
		 * 硬件加速检测
		 */
		useEffect(() => {
			getHardwareAccelerationStatus()
		}, [])

		/**
		 * 解析内容并设置初始数据
		 */
		useEffect(() => {
			// 检测 nodeId 是否变化
			const nodeIdChanged = prevNodeIdRef.current !== null && prevNodeIdRef.current !== nodeId

			// 如果 nodeId 变化，重置状态
			if (nodeIdChanged) {
				console.log("[ExcalidrawEditor] nodeId 变化，重置状态:", {
					from: prevNodeIdRef.current,
					to: nodeId,
				})
				isInitializedRef.current = false
				sizeStableRef.current = false
				setInitialData(null)
				setContainerSize(null)
			}

			// 更新 prevNodeIdRef
			prevNodeIdRef.current = nodeId

			// 检查是否有待保存的内容（单例模式下，model 可能已存在）
			const pendingContent = saveServiceManager.getPendingContent(nodeId)
			if (pendingContent !== null && !isInitializedRef.current) {
				console.log("[ExcalidrawEditor] 使用待保存的内容")
				const parsed = parseExcalidrawContent(pendingContent)
				setInitialData(parsed)
				isInitializedRef.current = true
				return
			}

			// 只有在未初始化且 content 已加载时才解析内容
			if (content !== undefined && !isInitializedRef.current) {
				const parsed = parseExcalidrawContent(content?.content)
				setInitialData(parsed)
				isInitializedRef.current = true

				// 设置初始内容用于保存比较
				if (content?.content) {
					setInitialContent(content.content)
				}

				console.log("[ExcalidrawEditor] 初始化数据:", parsed)
			}
		}, [content, nodeId, setInitialContent])

		// 监听容器尺寸 - 使用防抖确保尺寸稳定
		useEffect(() => {
			const container = containerRef.current
			if (!container) return

			const { RESIZE_DEBOUNCE_DELAY, SIZE_CHANGE_THRESHOLD, MIN_VALID_SIZE, INITIAL_LAYOUT_DELAY } =
				EXCALIDRAW_PERFORMANCE_CONFIG

			let resizeTimeout: NodeJS.Timeout | null = null
			let lastWidth = 0
			let lastHeight = 0

			const updateSize = () => {
				const rect = container.getBoundingClientRect()
				const width = Math.floor(rect.width)
				const height = Math.floor(rect.height)

				if (width > MIN_VALID_SIZE && height > MIN_VALID_SIZE) {
					const widthChanged = Math.abs(width - lastWidth) > SIZE_CHANGE_THRESHOLD
					const heightChanged = Math.abs(height - lastHeight) > SIZE_CHANGE_THRESHOLD

					if (!sizeStableRef.current || widthChanged || heightChanged) {
						lastWidth = width
						lastHeight = height

						if (resizeTimeout) {
							clearTimeout(resizeTimeout)
						}

						resizeTimeout = setTimeout(() => {
							setContainerSize({ width, height })
							sizeStableRef.current = true
							console.log("[ExcalidrawEditor] 容器尺寸:", { width, height })
						}, RESIZE_DEBOUNCE_DELAY)
					}
				}
			}

			const initialTimeout = setTimeout(updateSize, INITIAL_LAYOUT_DELAY)

			const resizeObserver = new ResizeObserver(() => {
				if (sizeStableRef.current) {
					updateSize()
				}
			})
			resizeObserver.observe(container)

			return () => {
				clearTimeout(initialTimeout)
				if (resizeTimeout) {
					clearTimeout(resizeTimeout)
				}
				resizeObserver.disconnect()
			}
		}, [])

		/**
		 * onChange 回调处理器
		 * 使用 useUnifiedSave hook 的 updateContent
		 */
		const handleChange = useCallback(
			(
				elements: readonly unknown[],
				appState: Record<string, unknown>,
				files: Record<string, unknown>,
			) => {
				// 保存当前数据引用（用于手动保存）
				currentDataRef.current = { elements, appState, files }

				// 序列化并通过 hook 更新内容
				const serialized = serializeExcalidrawData(elements, appState, files)
				updateContent(serialized)
			},
			[updateContent],
		)

		/**
		 * 清理：组件卸载时的资源清理（只清理本地 refs，不清理 SaveModel）
		 */
		useEffect(() => {
			return () => {
				console.log("[ExcalidrawEditor] 组件卸载，清理本地资源")

				// 清理本地 refs
				currentDataRef.current = null
				isInitializedRef.current = false
				sizeStableRef.current = false
				prevNodeIdRef.current = null

				// 注意：不清理 SaveModel，它会保留以便 Tab 切换时使用
			}
		}, [])

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
			)
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
			)
		}

		return (
			<div ref={containerRef} className={cn("h-full w-full", className)}>
				<ExcalidrawEditorView
					key={nodeId}
					initialData={initialData}
					theme={isDark ? "dark" : "light"}
					onChange={handleChange}
					onSave={saveNow}
					containerSize={containerSize}
				/>
			</div>
		)
	},
)

ExcalidrawEditorContainer.displayName = "ExcalidrawEditorContainer"
