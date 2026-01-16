/**
 * @file fn/diagram/diagram.fn.ts
 * @description Diagram 纯函数
 *
 * 图表相关的纯函数：
 * - 无副作用
 * - 相同输入 → 相同输出
 * - 不修改输入参数
 */

import type { DiagramState } from "@/types/diagram"

// ============================================================================
// URL Generation (Pure Functions)
// ============================================================================

/**
 * 生成 PlantUML 图表的 Kroki URL
 *
 * @param krokiServerUrl - Kroki 服务器 URL
 * @param format - 输出格式（svg 或 png）
 * @returns Kroki PlantUML URL
 * @throws 如果 Kroki 服务器 URL 未配置
 */
export const getKrokiPlantUMLUrl = (
	krokiServerUrl: string,
	format: "svg" | "png" = "svg",
): string => {
	if (!krokiServerUrl) {
		throw new Error("Kroki server URL not configured")
	}

	return `${krokiServerUrl}/plantuml/${format}`
}

/**
 * 生成 Mermaid 图表的 Kroki URL
 *
 * @param krokiServerUrl - Kroki 服务器 URL
 * @param format - 输出格式（svg 或 png）
 * @returns Kroki Mermaid URL
 * @throws 如果 Kroki 服务器 URL 未配置
 */
export const getKrokiMermaidUrl = (
	krokiServerUrl: string,
	format: "svg" | "png" = "svg",
): string => {
	if (!krokiServerUrl) {
		throw new Error("Kroki server URL not configured")
	}

	return `${krokiServerUrl}/mermaid/${format}`
}

// ============================================================================
// State Validation (Pure Functions)
// ============================================================================

/**
 * 检查 Kroki 是否已启用且配置正确
 *
 * @param state - 图表状态
 * @returns Kroki 是否已启用
 */
export const isKrokiEnabled = (state: DiagramState): boolean => {
	return state.enableKroki && !!state.krokiServerUrl
}

/**
 * 验证 Kroki 服务器 URL 格式
 *
 * @param url - 要验证的 URL
 * @returns URL 是否有效
 */
export const isValidKrokiUrl = (url: string): boolean => {
	if (!url) {
		return false
	}
	try {
		const parsed = new URL(url)
		return parsed.protocol === "http:" || parsed.protocol === "https:"
	} catch {
		return false
	}
}

/**
 * 规范化 Kroki 服务器 URL（移除尾部斜杠）
 *
 * @param url - 要规范化的 URL
 * @returns 规范化后的 URL
 */
export const normalizeKrokiUrl = (url: string): string => {
	return url.replace(/\/+$/, "")
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * 默认的 Kroki 服务器 URL
 */
export const DEFAULT_KROKI_URL = "https://kroki.io"

/**
 * 创建默认的图表状态
 *
 * @returns 默认的图表状态
 */
export const createDefaultDiagramState = (): DiagramState => ({
	enableKroki: true,
	krokiServerUrl: DEFAULT_KROKI_URL,
})
