/**
 * @file diagram-editor.container.fn.tsx
 * @description DiagramEditor 容器组件
 *
 * 负责数据获取、状态管理和业务逻辑。
 * 将数据通过 props 传递给纯展示组件 DiagramEditorView。
 * 支持 Ctrl+S 快捷键立即保存。
 *
 * 渲染策略：
 * - Mermaid: 默认使用客户端渲染（mermaid.js），无需配置
 * - PlantUML: 需要 Kroki 服务器渲染
 *
 * 数据流（保存）：
 * Editor → useEditorSave → EditorSaveService → DB → SaveStore → UI 反馈
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 7.2
 */

import { useNavigate } from "@tanstack/react-router";
import { debounce } from "es-toolkit";
import * as E from "fp-ts/Either";
import mermaid from "mermaid";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { getContentByNodeId } from "@/db";
import { getKrokiPlantUMLUrl, isKrokiEnabled } from "@/fn/diagram/diagram.fn";
import { useEditorSave } from "@/hooks/use-editor-save";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import logger from "@/log";
import { useDiagramStore } from "@/stores/diagram.store";

// 初始化 Mermaid 配置
mermaid.initialize({
	startOnLoad: false,
	theme: "default",
	securityLevel: "loose",
});

import type {
	DiagramEditorContainerProps,
	DiagramError,
	DiagramErrorType,
	DiagramType,
} from "./diagram-editor.types";
import { DiagramEditorView } from "./diagram-editor.view.fn";

// ==============================
// Constants
// ==============================

/** 预览更新防抖延迟（毫秒） */
const PREVIEW_DEBOUNCE_MS = 500;

/** 自动保存防抖延迟（毫秒） */
const AUTOSAVE_DEBOUNCE_MS = 1000;

/** 最大重试次数 */
const MAX_RETRY_COUNT = 3;

/** 重试基础延迟（毫秒） */
const RETRY_BASE_DELAY_MS = 1000;

// ==============================
// Helper Functions
// ==============================

/**
 * 判断错误类型
 */
const classifyError = (
	error: unknown,
	statusCode?: number,
): DiagramErrorType => {
	// 网络错误
	if (error instanceof TypeError && error.message.includes("fetch")) {
		return "network";
	}

	// 根据 HTTP 状态码判断
	if (statusCode) {
		// 4xx 客户端错误通常是语法错误
		if (statusCode >= 400 && statusCode < 500) {
			return "syntax";
		}
		// 5xx 服务器错误
		if (statusCode >= 500) {
			return "server";
		}
	}

	// 检查错误消息中的关键词
	const errorMessage =
		error instanceof Error ? error.message.toLowerCase() : "";
	if (
		errorMessage.includes("syntax") ||
		errorMessage.includes("parse") ||
		errorMessage.includes("invalid") ||
		errorMessage.includes("unexpected")
	) {
		return "syntax";
	}

	if (
		errorMessage.includes("network") ||
		errorMessage.includes("connection") ||
		errorMessage.includes("timeout") ||
		errorMessage.includes("econnrefused")
	) {
		return "network";
	}

	return "unknown";
};

/**
 * 创建错误对象
 */
const createDiagramError = (
	error: unknown,
	statusCode?: number,
	retryCount = 0,
): DiagramError => {
	const type = classifyError(error, statusCode);
	const message =
		error instanceof Error ? error.message : "Unknown error occurred";

	// 语法错误不可重试，其他错误在未达到最大重试次数时可重试
	const retryable = type !== "syntax" && retryCount < MAX_RETRY_COUNT;

	return {
		type,
		message,
		retryable,
		retryCount,
	};
};

/**
 * 计算重试延迟（指数退避）
 */
const getRetryDelay = (retryCount: number): number => {
	return RETRY_BASE_DELAY_MS * 2 ** retryCount;
};

/**
 * 延迟函数
 */
const delay = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 调用 Kroki 服务渲染图表（带重试）
 */
const renderDiagramWithRetry = async (
	code: string,
	diagramType: DiagramType,
	krokiServerUrl: string,
	retryCount = 0,
	onRetryAttempt?: (count: number) => void,
): Promise<{ svg: string } | { error: DiagramError }> => {
	const url = getKrokiPlantUMLUrl(krokiServerUrl);

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "text/plain",
			},
			body: code,
		});

		if (!response.ok) {
			const errorText = await response.text();
			const error = new Error(errorText || `HTTP ${response.status}`);
			const diagramError = createDiagramError(
				error,
				response.status,
				retryCount,
			);

			// 如果可重试且未达到最大重试次数，自动重试
			if (diagramError.retryable && retryCount < MAX_RETRY_COUNT) {
				const delayMs = getRetryDelay(retryCount);
				logger.info(
					`[DiagramEditor] 重试渲染 (${retryCount + 1}/${MAX_RETRY_COUNT})，延迟 ${delayMs}ms`,
				);
				onRetryAttempt?.(retryCount + 1);
				await delay(delayMs);
				return renderDiagramWithRetry(
					code,
					diagramType,
					krokiServerUrl,
					retryCount + 1,
					onRetryAttempt,
				);
			}

			return { error: diagramError };
		}

		const svg = await response.text();
		return { svg };
	} catch (err) {
		const diagramError = createDiagramError(err, undefined, retryCount);

		// 如果是网络错误且未达到最大重试次数，自动重试
		if (diagramError.retryable && retryCount < MAX_RETRY_COUNT) {
			const delayMs = getRetryDelay(retryCount);
			logger.info(
				`[DiagramEditor] 网络错误，重试 (${retryCount + 1}/${MAX_RETRY_COUNT})，延迟 ${delayMs}ms`,
			);
			onRetryAttempt?.(retryCount + 1);
			await delay(delayMs);
			return renderDiagramWithRetry(
				code,
				diagramType,
				krokiServerUrl,
				retryCount + 1,
				onRetryAttempt,
			);
		}

		return { error: diagramError };
	}
};

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
 * - 使用 useEditorSave hook 统一保存逻辑
 * - 处理防抖更新
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

	// 检查 Kroki 是否已配置
	const isKrokiConfigured = useMemo(
		() => isKrokiEnabled({ krokiServerUrl, enableKroki }),
		[krokiServerUrl, enableKroki],
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
	// 统一保存逻辑（使用 useEditorSave hook）
	// ==============================

	const { updateContent, saveNow, hasUnsavedChanges, setInitialContent } =
		useEditorSave({
			nodeId,
			contentType: "text", // 图表内容使用 "text" 类型存储（纯文本 Mermaid/PlantUML 语法）
			autoSaveDelay: AUTOSAVE_DEBOUNCE_MS,
			onSaveSuccess: () => {
				logger.success("[DiagramEditor] 内容保存成功");
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
	// 渲染预览（防抖）
	// ==============================

	const updatePreview = useCallback(
		async (newCode: string, isManualRetry = false) => {
			if (!isKrokiConfigured || !newCode.trim()) {
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

			const result = await renderDiagramWithRetry(
				newCode,
				diagramType,
				krokiServerUrl,
				0,
				(retryCount) => {
					// 更新错误状态以显示重试次数
					setError((prev) => (prev ? { ...prev, retryCount } : null));
				},
			);

			if ("svg" in result) {
				setPreviewSvg(result.svg);
				setError(null);
				logger.success("[DiagramEditor] 预览渲染成功");
			} else {
				setError(result.error);
				setPreviewSvg(null);
				logger.error("[DiagramEditor] 预览渲染失败:", result.error.message);

				// 如果是网络或服务器错误且已达到最大重试次数，显示 toast
				if (
					(result.error.type === "network" || result.error.type === "server") &&
					result.error.retryCount >= MAX_RETRY_COUNT
				) {
					toast.error("Failed to render diagram after multiple attempts");
				}
			}

			setIsLoading(false);
		},
		[isKrokiConfigured, diagramType, krokiServerUrl],
	);

	// 防抖预览更新
	const debouncedPreview = useMemo(
		() => debounce(updatePreview, PREVIEW_DEBOUNCE_MS),
		[updatePreview],
	);

	// ==============================
	// 初始化预览
	// ==============================

	useEffect(() => {
		if (isInitialized && code && isKrokiConfigured) {
			updatePreview(code);
		}
	}, [isInitialized, isKrokiConfigured]); // 只在初始化和配置变化时触发

	// ==============================
	// 代码变化处理
	// ==============================

	const handleCodeChange = useCallback(
		(newCode: string) => {
			setCode(newCode);

			// 防抖更新预览
			debouncedPreview(newCode);

			// 使用统一保存逻辑（触发防抖保存）
			updateContent(newCode);
		},
		[debouncedPreview, updateContent],
	);

	/**
	 * 手动保存处理器 (Ctrl+S)
	 * 使用 useEditorSave hook 的 saveNow 方法
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
			// 取消防抖预览
			debouncedPreview.cancel();
			// 取消正在进行的请求
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
			// 注意：useEditorSave hook 会自动处理组件卸载时的保存和清理
		};
	}, [debouncedPreview]);

	// ==============================
	// 渲染
	// ==============================

	return (
		<div className={cn("h-full w-full", className)}>
			<DiagramEditorView
				code={code}
				diagramType={diagramType}
				previewSvg={previewSvg}
				isLoading={isLoading}
				error={error}
				isKrokiConfigured={isKrokiConfigured}
				theme={isDark ? "dark" : "light"}
				onCodeChange={handleCodeChange}
				onSave={handleManualSave}
				onOpenSettings={handleOpenSettings}
				onRetry={handleRetry}
			/>
		</div>
	);
});
