/**
 * @file fn/diagram/diagram.render.fn.ts
 * @description 图表渲染纯函数
 *
 * 功能说明：
 * - Mermaid: 客户端渲染（mermaid.js），无需服务器
 * - PlantUML: Kroki 服务器渲染
 *
 * 设计理念：
 * - 纯函数：相同输入 → 相同输出
 * - 错误处理：返回 Either 类型
 * - 可测试：不依赖外部状态
 */

import mermaid from "mermaid";
import { getKrokiPlantUMLUrl } from "./diagram.fn";

// ============================================================================
// Types
// ============================================================================

/** 图表类型 */
export type DiagramType = "mermaid" | "plantuml";

/** 错误类型 */
export type DiagramErrorType = "syntax" | "network" | "server" | "unknown";

/** 图表渲染错误 */
export interface DiagramError {
	readonly type: DiagramErrorType;
	readonly message: string;
	readonly retryable: boolean;
	readonly retryCount: number;
}

/** 渲染结果 */
export type RenderResult =
	| { readonly success: true; readonly svg: string }
	| { readonly success: false; readonly error: DiagramError };

// ============================================================================
// Constants
// ============================================================================

/** 最大重试次数 */
const MAX_RETRY_COUNT = 3;

/** 重试基础延迟（毫秒） */
const RETRY_BASE_DELAY_MS = 1000;

// ============================================================================
// Mermaid 初始化
// ============================================================================

// 初始化 Mermaid 配置（只执行一次）
let mermaidInitialized = false;

const initMermaid = (): void => {
	if (mermaidInitialized) return;
	mermaid.initialize({
		startOnLoad: false,
		theme: "default",
		securityLevel: "loose",
	});
	mermaidInitialized = true;
};

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

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
		if (statusCode >= 400 && statusCode < 500) {
			return "syntax";
		}
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

// ============================================================================
// Render Functions
// ============================================================================

/**
 * 使用 Mermaid.js 客户端渲染图表
 *
 * @param code - Mermaid 代码
 * @returns 渲染结果
 */
export const renderMermaid = async (code: string): Promise<RenderResult> => {
	if (!code.trim()) {
		return {
			success: false,
			error: {
				type: "syntax",
				message: "Empty diagram code",
				retryable: false,
				retryCount: 0,
			},
		};
	}

	try {
		initMermaid();
		// 生成唯一 ID（使用 crypto.randomUUID 更可靠）
		const id = `mermaid-${crypto.randomUUID()}`;
		const { svg } = await mermaid.render(id, code);
		return { success: true, svg };
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Mermaid render failed";
		return {
			success: false,
			error: {
				type: "syntax",
				message,
				retryable: false,
				retryCount: 0,
			},
		};
	}
};

/**
 * 使用 Kroki 服务器渲染 PlantUML 图表（带重试）
 *
 * @param code - PlantUML 代码
 * @param krokiServerUrl - Kroki 服务器 URL
 * @param retryCount - 当前重试次数
 * @param onRetryAttempt - 重试回调
 * @returns 渲染结果
 */
export const renderPlantUML = async (
	code: string,
	krokiServerUrl: string,
	retryCount = 0,
	onRetryAttempt?: (count: number) => void,
): Promise<RenderResult> => {
	if (!code.trim()) {
		return {
			success: false,
			error: {
				type: "syntax",
				message: "Empty diagram code",
				retryable: false,
				retryCount: 0,
			},
		};
	}

	if (!krokiServerUrl) {
		return {
			success: false,
			error: {
				type: "network",
				message: "Kroki server URL not configured",
				retryable: false,
				retryCount: 0,
			},
		};
	}

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
				onRetryAttempt?.(retryCount + 1);
				await delay(delayMs);
				return renderPlantUML(
					code,
					krokiServerUrl,
					retryCount + 1,
					onRetryAttempt,
				);
			}

			return { success: false, error: diagramError };
		}

		const svg = await response.text();
		return { success: true, svg };
	} catch (err) {
		const diagramError = createDiagramError(err, undefined, retryCount);

		// 如果是网络错误且未达到最大重试次数，自动重试
		if (diagramError.retryable && retryCount < MAX_RETRY_COUNT) {
			const delayMs = getRetryDelay(retryCount);
			onRetryAttempt?.(retryCount + 1);
			await delay(delayMs);
			return renderPlantUML(
				code,
				krokiServerUrl,
				retryCount + 1,
				onRetryAttempt,
			);
		}

		return { success: false, error: diagramError };
	}
};

/**
 * 根据图表类型渲染图表
 *
 * @param code - 图表代码
 * @param diagramType - 图表类型
 * @param krokiServerUrl - Kroki 服务器 URL（仅 PlantUML 需要）
 * @param onRetryAttempt - 重试回调
 * @returns 渲染结果
 */
export const renderDiagram = async (
	code: string,
	diagramType: DiagramType,
	krokiServerUrl?: string,
	onRetryAttempt?: (count: number) => void,
): Promise<RenderResult> => {
	if (diagramType === "mermaid") {
		return renderMermaid(code);
	}
	return renderPlantUML(code, krokiServerUrl || "", 0, onRetryAttempt);
};
