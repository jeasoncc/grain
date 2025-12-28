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
 * 调用 Kroki 服务渲染图表
 */
const renderDiagram = async (
	code: string,
	diagramType: DiagramType,
	krokiServerUrl: string,
): Promise<string> => {
	const url = getKrokiUrl(diagramType, krokiServerUrl);

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "text/plain",
		},
		body: code,
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(errorText || `HTTP ${response.status}`);
	}

	return response.text();
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
	const [error, setError] = useState<string | null>(null);
	const [isInitialized, setIsInitialized] = useState(false);

	// 用于追踪是否有未保存的更改
	const hasUnsavedChanges = useRef(false);
	const lastSavedCode = useRef("");

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
		async (newCode: string) => {
			if (!isKrokiConfigured || !newCode.trim()) {
				setPreviewSvg(null);
				setError(null);
				return;
			}

			setIsLoading(true);
			setError(null);

			try {
				const svg = await renderDiagram(newCode, diagramType, krokiServerUrl);
				setPreviewSvg(svg);
				logger.success("[DiagramEditor] 预览渲染成功");
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Unknown error";
				setError(errorMessage);
				setPreviewSvg(null);
				logger.error("[DiagramEditor] 预览渲染失败:", errorMessage);
			} finally {
				setIsLoading(false);
			}
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
			updatePreview(code);
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
