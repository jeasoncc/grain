/**
 * @file fn/diagram/diagram.render.fn.ts
 * @description 图表渲染统一接口
 *
 * 功能说明：
 * - 提供统一的 renderDiagram 接口
 * - Mermaid: 客户端渲染（mermaid.js），无需服务器，支持主题切换
 * - PlantUML: Kroki 服务器渲染，支持自动重试
 *
 * 设计理念：
 * - 统一接口：根据 diagramType 自动选择渲染策略
 * - 纯函数：相同输入 → 相同输出
 * - 错误处理：返回统一的结果类型
 *
 * @requirements 8.1, 8.2, 8.3
 */

import {
	initMermaid,
	type MermaidTheme,
	renderMermaid as renderMermaidWithTheme,
} from "./mermaid.render.fn"
import {
	type PlantUMLRenderConfig,
	renderPlantUML as renderPlantUMLWithRetry,
} from "./plantuml.render.fn"

// ============================================================================
// Types
// ============================================================================

/** 图表类型 */
export type DiagramType = "mermaid" | "plantuml"

/** 错误类型 */
export type DiagramErrorType = "syntax" | "network" | "server" | "config" | "unknown"

/** 图表渲染错误 */
export interface DiagramError {
	readonly type: DiagramErrorType
	readonly message: string
	readonly retryable: boolean
	readonly retryCount: number
}

/** 渲染成功结果 */
export interface RenderSuccess {
	readonly success: true
	readonly svg: string
}

/** 渲染失败结果 */
export interface RenderFailure {
	readonly success: false
	readonly error: DiagramError
}

/** 渲染结果 */
export type RenderResult = RenderSuccess | RenderFailure

/** 统一渲染配置 */
export interface RenderDiagramConfig {
	/** 图表代码 */
	readonly code: string
	/** 图表类型 */
	readonly diagramType: DiagramType
	/** 主题（Mermaid 使用） */
	readonly theme?: MermaidTheme
	/** Kroki 服务器 URL（PlantUML 使用） */
	readonly krokiServerUrl?: string
	/** 容器 ID（Mermaid 使用，用于生成唯一 SVG ID） */
	readonly containerId?: string
	/** 重试回调（PlantUML 使用） */
	readonly onRetryAttempt?: (attempt: number, maxRetries: number) => void
}

// ============================================================================
// Mermaid 渲染
// ============================================================================

/**
 * 使用 Mermaid.js 客户端渲染图表
 *
 * @param code - Mermaid 代码
 * @param theme - 主题（light/dark）
 * @param containerId - 容器 ID
 * @returns 渲染结果
 */
export const renderMermaid = async (
	code: string,
	theme: MermaidTheme = "light",
	containerId?: string,
): Promise<RenderResult> => {
	if (!code.trim()) {
		return {
			error: {
				message: "图表代码为空",
				retryable: false,
				retryCount: 0,
				type: "syntax",
			},
			success: false,
		}
	}

	// 初始化 Mermaid（如果主题变化会重新初始化）
	initMermaid(theme)

	// 调用 mermaid.render.fn.ts 中的渲染函数
	const result = await renderMermaidWithTheme(code, containerId)

	if ("svg" in result) {
		return { success: true, svg: result.svg }
	}

	return {
		error: {
			message: result.error,
			retryable: false,
			retryCount: 0,
			type: "syntax",
		},
		success: false,
	}
}

// ============================================================================
// PlantUML 渲染
// ============================================================================

/**
 * 使用 Kroki 服务器渲染 PlantUML 图表
 *
 * @param code - PlantUML 代码
 * @param krokiServerUrl - Kroki 服务器 URL
 * @param onRetryAttempt - 重试回调
 * @returns 渲染结果
 */
export const renderPlantUML = async (
	code: string,
	krokiServerUrl: string,
	onRetryAttempt?: (attempt: number, maxRetries: number) => void,
): Promise<RenderResult> => {
	if (!code.trim()) {
		return {
			error: {
				message: "图表代码为空",
				retryable: false,
				retryCount: 0,
				type: "syntax",
			},
			success: false,
		}
	}

	if (!krokiServerUrl) {
		return {
			error: {
				message: "Kroki 服务器 URL 未配置",
				retryable: false,
				retryCount: 0,
				type: "config",
			},
			success: false,
		}
	}

	// 调用 plantuml.render.fn.ts 中的渲染函数
	const config: PlantUMLRenderConfig = {
		krokiServerUrl,
		onRetryAttempt,
	}

	const result = await renderPlantUMLWithRetry(code, config)

	if ("svg" in result) {
		return { success: true, svg: result.svg }
	}

	return {
		error: {
			message: result.error,
			retryable: result.retryable,
			retryCount: 0, // 重试已在 plantuml.render.fn.ts 内部处理
			type: result.errorType,
		},
		success: false,
	}
}

// ============================================================================
// 统一渲染接口
// ============================================================================

/**
 * 根据图表类型渲染图表（统一接口）
 *
 * 渲染策略：
 * - Mermaid: 客户端渲染（mermaid.js），支持主题切换，无需服务器
 * - PlantUML: Kroki 服务器渲染，支持自动重试
 *
 * @param config - 渲染配置
 * @returns 渲染结果
 *
 * @example
 * ```typescript
 * // Mermaid 渲染（客户端）
 * const result = await renderDiagram({
 *   code: "graph TD\n  A --> B",
 *   diagramType: "mermaid",
 *   theme: "dark",
 * });
 *
 * // PlantUML 渲染（Kroki 服务器）
 * const result = await renderDiagram({
 *   code: "@startuml\nAlice -> Bob: Hello\n@enduml",
 *   diagramType: "plantuml",
 *   krokiServerUrl: "https://kroki.io",
 * });
 *
 * if (result.success) {
 *   console.log("SVG:", result.svg);
 * } else {
 *   console.error("Error:", result.error.message);
 * }
 * ```
 */
export const renderDiagram = async (config: RenderDiagramConfig): Promise<RenderResult> => {
	const { code, diagramType, theme = "light", krokiServerUrl, containerId, onRetryAttempt } = config

	switch (diagramType) {
		case "mermaid":
			return renderMermaid(code, theme, containerId)

		case "plantuml":
			return renderPlantUML(code, krokiServerUrl ?? "", onRetryAttempt)

		default: {
			// TypeScript exhaustive check
			const _exhaustive: never = diagramType
			return {
				error: {
					message: `不支持的图表类型: ${_exhaustive}`,
					retryable: false,
					retryCount: 0,
					type: "unknown",
				},
				success: false,
			}
		}
	}
}

// ============================================================================
// 便捷函数（向后兼容）
// ============================================================================

/**
 * 简化版渲染函数（向后兼容）
 *
 * @deprecated 请使用 renderDiagram 统一接口
 */
export const renderDiagramSimple = async (
	code: string,
	diagramType: DiagramType,
	krokiServerUrl?: string,
	onRetryAttempt?: (count: number) => void,
): Promise<RenderResult> => {
	return renderDiagram({
		code,
		diagramType,
		krokiServerUrl,
		onRetryAttempt: onRetryAttempt ? (attempt, _max) => onRetryAttempt(attempt) : undefined,
	})
}
