/**
 * @file fn/diagram/plantuml.render.fn.ts
 * @description PlantUML 图表 Kroki 服务器渲染纯函数
 *
 * 功能说明：
 * - 使用 Kroki API 进行服务器端渲染
 * - 支持网络错误和服务器错误处理
 * - 支持自动重试逻辑（指数退避）
 *
 * 设计理念：
 * - 纯函数：相同输入 → 相同输出
 * - 错误处理：返回友好的错误信息
 * - 可靠性：网络错误自动重试
 */

import { getKrokiPlantUMLUrl } from "./diagram.fn"

// ============================================================================
// Types
// ============================================================================

/** PlantUML 渲染成功结果 */
export interface PlantUMLRenderSuccess {
	readonly svg: string
}

/** PlantUML 渲染错误结果 */
export interface PlantUMLRenderError {
	readonly error: string
	readonly errorType: PlantUMLErrorType
	readonly retryable: boolean
}

/** PlantUML 渲染结果 */
export type PlantUMLRenderResult = PlantUMLRenderSuccess | PlantUMLRenderError

/** PlantUML 错误类型 */
export type PlantUMLErrorType =
	| "syntax" // 语法错误（PlantUML 代码有问题）
	| "network" // 网络错误（无法连接到 Kroki 服务器）
	| "server" // 服务器错误（Kroki 服务器返回 5xx）
	| "config" // 配置错误（Kroki URL 未配置）
	| "unknown" // 未知错误

/** PlantUML 渲染配置 */
export interface PlantUMLRenderConfig {
	/** Kroki 服务器 URL */
	readonly krokiServerUrl: string
	/** 最大重试次数（默认 3） */
	readonly maxRetries?: number
	/** 重试基础延迟（毫秒，默认 1000） */
	readonly retryBaseDelay?: number
	/** 重试回调 */
	readonly onRetryAttempt?: (attempt: number, maxRetries: number) => void
}

// ============================================================================
// Constants
// ============================================================================

/** 默认最大重试次数 */
const DEFAULT_MAX_RETRIES = 3

/** 默认重试基础延迟（毫秒） */
const DEFAULT_RETRY_BASE_DELAY_MS = 1000

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 延迟函数
 */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 计算重试延迟（指数退避）
 *
 * @param attempt - 当前重试次数（从 0 开始）
 * @param baseDelay - 基础延迟（毫秒）
 * @returns 延迟时间（毫秒）
 */
const getRetryDelay = (attempt: number, baseDelay: number): number => {
	return baseDelay * 2 ** attempt
}

/**
 * 根据 HTTP 状态码判断错误类型
 *
 * @param statusCode - HTTP 状态码
 * @returns 错误类型
 */
const getErrorTypeFromStatus = (statusCode: number): PlantUMLErrorType => {
	if (statusCode >= 400 && statusCode < 500) {
		return "syntax" // 4xx 通常是客户端错误（语法问题）
	}
	if (statusCode >= 500) {
		return "server" // 5xx 是服务器错误
	}
	return "unknown"
}

/**
 * 根据错误对象判断错误类型
 *
 * @param error - 错误对象
 * @returns 错误类型
 */
const getErrorTypeFromError = (error: unknown): PlantUMLErrorType => {
	if (!(error instanceof Error)) {
		return "unknown"
	}

	const message = error.message.toLowerCase()

	// 网络相关错误
	if (
		message.includes("fetch") ||
		message.includes("network") ||
		message.includes("connection") ||
		message.includes("timeout") ||
		message.includes("econnrefused") ||
		message.includes("dns") ||
		message.includes("socket")
	) {
		return "network"
	}

	return "unknown"
}

/**
 * 判断错误是否可重试
 *
 * @param errorType - 错误类型
 * @returns 是否可重试
 */
const isRetryableError = (errorType: PlantUMLErrorType): boolean => {
	// 语法错误和配置错误不可重试
	// 网络错误和服务器错误可以重试
	return errorType === "network" || errorType === "server"
}

/**
 * 解析 Kroki 服务器返回的错误信息
 *
 * @param errorText - 服务器返回的错误文本
 * @param statusCode - HTTP 状态码
 * @returns 友好的错误描述
 */
const parseKrokiError = (errorText: string, statusCode: number): string => {
	// 空错误文本
	if (!errorText.trim()) {
		return `Kroki 服务器错误 (HTTP ${statusCode})`
	}

	// 尝试解析常见的 PlantUML 错误
	const lowerText = errorText.toLowerCase()

	// 语法错误
	if (lowerText.includes("syntax error")) {
		return `PlantUML 语法错误：${errorText}`
	}

	// 未知图表类型
	if (lowerText.includes("unknown diagram")) {
		return "未知的图表类型。请确保代码以 @startuml 开头，以 @enduml 结尾"
	}

	// 超时
	if (lowerText.includes("timeout")) {
		return "渲染超时：图表可能过于复杂，请尝试简化"
	}

	// 返回原始错误（截断过长的错误信息）
	const maxLength = 200
	if (errorText.length > maxLength) {
		return `${errorText.substring(0, maxLength)}...`
	}

	return errorText
}

// ============================================================================
// Public Functions
// ============================================================================

/**
 * 渲染 PlantUML 图表（通过 Kroki 服务器）
 *
 * @param code - PlantUML 代码
 * @param config - 渲染配置
 * @returns 渲染结果，包含 SVG 字符串或错误信息
 *
 * @example
 * ```typescript
 * const result = await renderPlantUML(
 *   "@startuml\nAlice -> Bob: Hello\n@enduml",
 *   { krokiServerUrl: "https://kroki.io" }
 * );
 *
 * if ("svg" in result) {
 *   console.log("渲染成功:", result.svg);
 * } else {
 *   console.error("渲染失败:", result.error);
 *   if (result.retryable) {
 *     console.log("可以重试");
 *   }
 * }
 * ```
 */
export const renderPlantUML = async (
	code: string,
	config: PlantUMLRenderConfig,
): Promise<PlantUMLRenderResult> => {
	const {
		krokiServerUrl,
		maxRetries = DEFAULT_MAX_RETRIES,
		retryBaseDelay = DEFAULT_RETRY_BASE_DELAY_MS,
		onRetryAttempt,
	} = config

	// 空代码检查
	if (!code.trim()) {
		return {
			error: "图表代码为空",
			errorType: "syntax",
			retryable: false,
		}
	}

	// Kroki URL 配置检查
	if (!krokiServerUrl) {
		return {
			error: "Kroki 服务器 URL 未配置",
			errorType: "config",
			retryable: false,
		}
	}

	// 内部重试函数
	const attemptRender = async (attempt: number): Promise<PlantUMLRenderResult> => {
		try {
			const url = getKrokiPlantUMLUrl(krokiServerUrl)

			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "text/plain",
				},
				body: code,
			})

			if (!response.ok) {
				const errorText = await response.text()
				const errorType = getErrorTypeFromStatus(response.status)
				const retryable = isRetryableError(errorType) && attempt < maxRetries

				// 如果可重试，执行重试
				if (retryable) {
					const delayMs = getRetryDelay(attempt, retryBaseDelay)
					onRetryAttempt?.(attempt + 1, maxRetries)
					await delay(delayMs)
					return attemptRender(attempt + 1)
				}

				return {
					error: parseKrokiError(errorText, response.status),
					errorType,
					retryable: false,
				}
			}

			const svg = await response.text()
			return { svg }
		} catch (error) {
			const errorType = getErrorTypeFromError(error)
			const retryable = isRetryableError(errorType) && attempt < maxRetries

			// 如果可重试，执行重试
			if (retryable) {
				const delayMs = getRetryDelay(attempt, retryBaseDelay)
				onRetryAttempt?.(attempt + 1, maxRetries)
				await delay(delayMs)
				return attemptRender(attempt + 1)
			}

			const message = error instanceof Error ? error.message : "未知错误"

			return {
				error: `网络错误：${message}`,
				errorType,
				retryable: false,
			}
		}
	}

	return attemptRender(0)
}

/**
 * 渲染 PlantUML 图表（简化版，不带重试）
 *
 * @param code - PlantUML 代码
 * @param krokiServerUrl - Kroki 服务器 URL
 * @returns 渲染结果
 *
 * @example
 * ```typescript
 * const result = await renderPlantUMLSimple(code, "https://kroki.io");
 * if ("svg" in result) {
 *   // 成功
 * } else {
 *   // 失败
 * }
 * ```
 */
export const renderPlantUMLSimple = async (
	code: string,
	krokiServerUrl: string,
): Promise<{ svg: string } | { error: string }> => {
	const result = await renderPlantUML(code, {
		krokiServerUrl,
		maxRetries: 0,
	})

	if ("svg" in result) {
		return { svg: result.svg }
	}

	return { error: result.error }
}

/**
 * 检查 Kroki 服务器是否可用
 *
 * @param krokiServerUrl - Kroki 服务器 URL
 * @param timeoutMs - 超时时间（毫秒，默认 5000）
 * @returns 服务器是否可用
 *
 * @example
 * ```typescript
 * const isAvailable = await checkKrokiServerHealth("https://kroki.io");
 * if (isAvailable) {
 *   console.log("Kroki 服务器可用");
 * }
 * ```
 */
export const checkKrokiServerHealth = async (
	krokiServerUrl: string,
	timeoutMs = 5000,
): Promise<boolean> => {
	if (!krokiServerUrl) {
		return false
	}

	try {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

		// 使用简单的 PlantUML 代码测试服务器
		const testCode = "@startuml\nA -> B\n@enduml"
		const url = getKrokiPlantUMLUrl(krokiServerUrl)

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "text/plain",
			},
			body: testCode,
			signal: controller.signal,
		})

		clearTimeout(timeoutId)
		return response.ok
	} catch {
		return false
	}
}
