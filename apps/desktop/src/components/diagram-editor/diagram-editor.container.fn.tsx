/**
 * @file diagram-editor.container.fn.tsx
 * @description DiagramEditor 容器组件
 *
 * 负责数据获取、状态管理和业务逻辑。
 * 将数据通过 props 传递给纯展示组件 DiagramEditorView。
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4
 */

import { useNavigate } from "@tanstack/react-router";
import { debounce } from "es-toolkit";
import * as E from "fp-ts/Either";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { getContentByNodeId, updateContentByNodeId } from "@/db";
import {
	getKrokiMermaidUrl,
	getKrokiPlantUMLUrl,
	isKrokiEnabled,
} from "@/fn/diagram/diagram.fn";
import { cn } from "@/lib/utils";
import logger from "@/log";
import { useDiagramStore } from "@/stores/diagram.store";

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
 * 根据图表类型获取 Kroki URL
 */
const getKrokiUrl = (
	diagramType: DiagramType,
	krokiServerUrl: string,
): string => {
	return diagramType === "mermaid"
		? getKrokiMermaidUrl(krokiServerUrl)
		: getKrokiPlantUMLUrl(krokiServerUrl);
};

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
	const url = getKrokiUrl(diagramType, krokiServerUrl);

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
 * - 自动保存内容到数据库
 * - 处理防抖更新
 */
export const DiagramEditorContainer = memo(function DiagramEditorContainer({
	nodeId,
	diagramType,
	className,
}: DiagramEditorContainerProps) {
	const navigate = useNavigate();

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

	// 用于追踪是否有未保存的更改
	const hasUnsavedChanges = useRef(false);
	const lastSavedCode = useRef("");

	// 用于取消正在进行的渲染请求
	const abortControllerRef = useRef<AbortController | null>(null);

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
					lastSavedCode.current = content.content;
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
	}, [nodeId]);

	// ==============================
	// 保存内容（防抖）
	// ==============================

	const saveContent = useCallback(
		async (newCode: string) => {
			if (newCode === lastSavedCode.current) {
				return;
			}

			logger.info("[DiagramEditor] 保存内容:", nodeId);

			// 根据图表类型选择内容类型
			const contentType = diagramType === "mermaid" ? "mermaid" : "plantuml";

			const result = await updateContentByNodeId(
				nodeId,
				newCode,
				contentType as "lexical" | "excalidraw",
			)();

			if (E.isRight(result)) {
				lastSavedCode.current = newCode;
				hasUnsavedChanges.current = false;
				logger.success("[DiagramEditor] 内容保存成功");
			} else {
				logger.error("[DiagramEditor] 保存内容失败:", result.left);
				toast.error("Failed to save diagram");
			}
		},
		[nodeId, diagramType],
	);

	// 防抖保存
	const debouncedSave = useMemo(
		() => debounce(saveContent, AUTOSAVE_DEBOUNCE_MS),
		[saveContent],
	);

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
			hasUnsavedChanges.current = true;

			// 防抖更新预览
			debouncedPreview(newCode);

			// 防抖保存
			debouncedSave(newCode);
		},
		[debouncedPreview, debouncedSave],
	);

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
			// 组件卸载时，如果有未保存的更改，立即保存
			if (hasUnsavedChanges.current) {
				saveContent(code);
			}
			// 取消防抖
			debouncedPreview.cancel();
			debouncedSave.cancel();
			// 取消正在进行的请求
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
	}, [code, saveContent, debouncedPreview, debouncedSave]);

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
				onCodeChange={handleCodeChange}
				onOpenSettings={handleOpenSettings}
				onRetry={handleRetry}
			/>
		</div>
	);
});
