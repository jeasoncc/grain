/**
 * @file diagram-editor.container.fn.tsx
 * @description DiagramEditor 容器组件
 *
 * 负责数据获取、状态管理和业务逻辑。
 * 将数据通过 props 传递给纯展示组件 DiagramEditorView。
 * 支持 Ctrl+S 快捷键立即保存。
 *
 * 渲染策略：
 * - Mermaid: 客户端渲染（mermaid.js），无需 Kroki 配置，支持主题切换
 * - PlantUML: 需要 Kroki 服务器渲染
 *
 * 数据流（保存）：
 * Editor → useUnifiedSave → UnifiedSaveService → DB → Tab.isDirty → SaveStore → UI 反馈
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 7.2, 8.1, 8.2, 8.3, 8.4, 8.5
 */

import type { DiagramError } from "@grain/diagram-editor";
import { useNavigate } from "@tanstack/react-router";
import * as E from "fp-ts/Either";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getContentByNodeId } from "@/db";
import { initMermaid, isKrokiEnabled, renderDiagram } from "@/fn/diagram";
import { useTheme } from "@/hooks/use-theme";
import { useUnifiedSave } from "@/hooks/use-unified-save";
import { cn } from "@/lib/utils";
import logger from "@/log";
import { useDiagramStore } from "@/stores/diagram.store";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";

import type { DiagramEditorContainerProps } from "./diagram-editor.types";
import { DiagramEditorView } from "./diagram-editor.view.fn";

// ==============================
// Constants
// ==============================

// 移除：预览更新防抖延迟（现在只在保存后渲染）

// ==============================
// Container Component
// ==============================

/**
 * DiagramEditor 容器组件
 *
 * 职责：
 * - 从数据库加载图表内容
 * - 管理编辑器状态（代码、预览、加载、错误）
 * - 调用 Kroki 服务渲染预览
 * - 使用 useUnifiedSave hook 统一保存逻辑
 * - 预览只在保存后触发（避免输入时频繁渲染）
 * - 支持 Ctrl+S 快捷键立即保存
 */
export const DiagramEditorContainer = memo(function DiagramEditorContainer({
	nodeId,
	diagramType,
	className,
}: DiagramEditorContainerProps) {
	const navigate = useNavigate();
	const { isDark } = useTheme();

	// ==============================
	// Store 连接
	// ==============================

	const krokiServerUrl = useDiagramStore((s) => s.krokiServerUrl);
	const enableKroki = useDiagramStore((s) => s.enableKroki);

	// 获取当前活动 tab ID（用于同步 isDirty 状态）
	const activeTabId = useEditorTabsStore((s) => s.activeTabId);

	// 检查 Kroki 是否已配置（仅 PlantUML 需要）
	const isKrokiConfigured = useMemo(
		() => isKrokiEnabled({ krokiServerUrl, enableKroki }),
		[krokiServerUrl, enableKroki],
	);

	// 判断是否可以渲染预览
	// - Mermaid: 始终可以渲染（客户端渲染，无需 Kroki）
	// - PlantUML: 需要 Kroki 配置
	const canRenderPreview = useMemo(
		() => diagramType === "mermaid" || isKrokiConfigured,
		[diagramType, isKrokiConfigured],
	);

	// ==============================
	// 本地状态
	// ==============================

	const [code, setCode] = useState("");
	const [previewSvg, setPreviewSvg] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<DiagramError | null>(null);
	const [isInitialized, setIsInitialized] = useState(false);

	// 用于取消正在进行的渲染请求
	const abortControllerRef = useRef<AbortController | null>(null);

	// ==============================
	// 统一保存逻辑（使用 useUnifiedSave hook）
	// 自动保存和手动保存（Ctrl+S）都通过同一个 hook 处理
	// ==============================

	// 用于在 onSaveSuccess 中访问最新的 code
	const codeRef = useRef(code);
	useEffect(() => {
		codeRef.current = code;
	}, [code]);

	const { updateContent, saveNow, hasUnsavedChanges, setInitialContent } =
		useUnifiedSave({
			nodeId,
			contentType: "text", // 图表内容使用 "text" 类型存储（纯文本 Mermaid/PlantUML 语法）
			tabId: activeTabId ?? undefined, // 传递 tabId 用于同步 isDirty 状态
			registerShortcut: false, // DiagramEditor 有自己的快捷键处理
			onSaveSuccess: () => {
				logger.success("[DiagramEditor] 内容保存成功");
				// 保存成功后触发预览渲染
				if (codeRef.current && canRenderPreview) {
					updatePreview(codeRef.current);
				}
			},
			onSaveError: (error) => {
				logger.error("[DiagramEditor] 保存内容失败:", error);
				toast.error("Failed to save diagram");
			},
		});

	// ==============================
	// 加载内容
	// ==============================

	useEffect(() => {
		const loadContent = async () => {
			logger.info("[DiagramEditor] 加载内容:", nodeId);

			const result = await getContentByNodeId(nodeId)();

			if (E.isRight(result)) {
				const content = result.right;
				if (content) {
					setCode(content.content);
					setInitialContent(content.content);
					logger.success("[DiagramEditor] 内容加载成功");
				} else {
					logger.info("[DiagramEditor] 内容为空，使用默认值");
				}
			} else {
				logger.error("[DiagramEditor] 加载内容失败:", result.left);
				toast.error("Failed to load diagram content");
			}

			setIsInitialized(true);
		};

		loadContent();
	}, [nodeId, setInitialContent]);

	// ==============================
	// 初始化 Mermaid（根据主题）
	// ==============================

	useEffect(() => {
		// 根据当前主题初始化 Mermaid
		initMermaid(isDark ? "dark" : "light");
	}, [isDark]);

	// ==============================
	// 渲染预览（只在保存后触发）
	// ==============================

	const updatePreview = useCallback(
		async (newCode: string, isManualRetry = false) => {
			// 检查是否可以渲染
			if (!canRenderPreview || !newCode.trim()) {
				setPreviewSvg(null);
				setError(null);
				return;
			}

			// 取消之前的请求
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
			abortControllerRef.current = new AbortController();

			setIsLoading(true);
			// 手动重试时保留错误信息直到成功
			if (!isManualRetry) {
				setError(null);
			}

			// 使用统一渲染接口
			const result = await renderDiagram({
				code: newCode,
				diagramType,
				theme: isDark ? "dark" : "light",
				krokiServerUrl: diagramType === "plantuml" ? krokiServerUrl : undefined,
				containerId: `diagram-preview-${nodeId}`,
				onRetryAttempt: (attempt, maxRetries) => {
					// 更新错误状态以显示重试次数
					logger.info(`[DiagramEditor] 重试渲染 (${attempt}/${maxRetries})`);
					setError((prev: DiagramError | null) =>
						prev ? { ...prev, retryCount: attempt } : null,
					);
				},
			});

			if (result.success) {
				setPreviewSvg(result.svg);
				setError(null);
				logger.success("[DiagramEditor] 预览渲染成功");
			} else {
				setError(result.error);
				setPreviewSvg(null);
				logger.error("[DiagramEditor] 预览渲染失败:", result.error.message);

				// 如果是网络或服务器错误，显示 toast
				if (result.error.type === "network" || result.error.type === "server") {
					toast.error("Failed to render diagram after multiple attempts");
				}
			}

			setIsLoading(false);
		},
		[canRenderPreview, diagramType, isDark, krokiServerUrl, nodeId],
	);

	// ==============================
	// 初始化预览
	// ==============================

	useEffect(() => {
		if (isInitialized && code && canRenderPreview) {
			updatePreview(code);
		}
	}, [isInitialized, canRenderPreview]); // 只在初始化和配置变化时触发，不依赖 code

	// ==============================
	// 代码变化处理（不触发实时预览）
	// ==============================

	const handleCodeChange = useCallback(
		(newCode: string) => {
			setCode(newCode);
			// 移除实时预览：debouncedPreview(newCode);
			// 使用统一保存逻辑（触发防抖保存，保存成功后会触发预览）
			updateContent(newCode);
		},
		[updateContent],
	);

	/**
	 * 手动保存处理器 (Ctrl+S)
	 * 使用 useUnifiedSave hook 的 saveNow 方法
	 * 保存成功后会通过 onSaveSuccess 回调触发预览渲染
	 */
	const handleManualSave = useCallback(async () => {
		if (!hasUnsavedChanges()) {
			toast.info("No changes to save");
			return;
		}

		logger.info("[DiagramEditor] 手动保存触发");
		await saveNow();
	}, [hasUnsavedChanges, saveNow]);

	// ==============================
	// 回调函数
	// ==============================

	const handleOpenSettings = useCallback(() => {
		navigate({ to: "/settings/diagrams" });
	}, [navigate]);

	const handleRetry = useCallback(() => {
		if (code) {
			// 重置错误状态的重试计数，允许重新开始重试
			setError(null);
			updatePreview(code, true);
		}
	}, [code, updatePreview]);

	// ==============================
	// 清理
	// ==============================

	useEffect(() => {
		return () => {
			// 取消正在进行的请求
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
			// 注意：useUnifiedSave hook 会自动处理组件卸载时的保存和清理
		};
	}, []);

	// ==============================
	// 渲染
	// ==============================

	// 对于 View 组件，isKrokiConfigured 的含义：
	// - Mermaid: 始终为 true（不需要 Kroki）
	// - PlantUML: 取决于实际的 Kroki 配置
	const showKrokiConfigured = diagramType === "mermaid" || isKrokiConfigured;

	return (
		<div className={cn("h-full w-full", className)}>
			<DiagramEditorView
				code={code}
				diagramType={diagramType}
				previewSvg={previewSvg}
				isLoading={isLoading}
				error={error}
				isKrokiConfigured={showKrokiConfigured}
				theme={isDark ? "dark" : "light"}
				onCodeChange={handleCodeChange}
				onSave={handleManualSave}
				onOpenSettings={handleOpenSettings}
				onRetry={handleRetry}
			/>
		</div>
	);
});
