/**
 * Excalidraw 编辑器工具函数
 *
 * 包含硬件加速检测和 WebView 优化相关的工具函数
 *
 * @requirements 6.1, 6.3
 */

/**
 * 硬件加速检测结果
 */

export interface HardwareAccelerationStatus {
	/** 是否支持 WebGL */
	readonly webglSupported: boolean
	/** WebGL 版本（1 或 2，0 表示不支持） */
	readonly webglVersion: 0 | 1 | 2
	/** 是否启用硬件加速 */
	readonly hardwareAccelerated: boolean
	/** GPU 渲染器信息 */
	readonly renderer: string | null
	/** GPU 厂商信息 */
	readonly vendor: string | null
	/** 检测时间戳 */
	readonly timestamp: number
}

/**
 * 检测 WebGL 支持和硬件加速状态
 *
 * 通过创建临时 Canvas 并获取 WebGL 上下文来检测：
 * 1. WebGL 是否可用
 * 2. 是否使用硬件加速（通过检查渲染器信息）
 *
 * @returns 硬件加速状态信息
 * @requirements 6.1
 */
export function detectHardwareAcceleration(): HardwareAccelerationStatus {
	const result: HardwareAccelerationStatus = {
		hardwareAccelerated: false,
		renderer: null,
		timestamp: Date.now(),
		vendor: null,
		webglSupported: false,
		webglVersion: 0,
	}

	try {
		// 创建临时 Canvas 用于检测
		const canvas = document.createElement("canvas")

		// 尝试获取 WebGL2 上下文
		let gl: WebGLRenderingContext | WebGL2RenderingContext | null = canvas.getContext("webgl2")
		let webglVersion: 0 | 1 | 2 = gl ? 2 : 0

		// 如果 WebGL2 不可用，尝试 WebGL1
		if (!gl) {
			gl =
				canvas.getContext("webgl") ||
				(canvas.getContext("experimental-webgl") as WebGLRenderingContext | null)
			webglVersion = gl ? 1 : 0
		}

		if (!gl) {
			return result
		}

		// 获取调试信息扩展
		const debugInfo = gl.getExtension("WEBGL_debug_renderer_info")

		let renderer: string | null = null
		let vendor: string | null = null

		if (debugInfo) {
			renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string
			vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string
		} else {
			// 回退到基本信息
			renderer = gl.getParameter(gl.RENDERER) as string
			vendor = gl.getParameter(gl.VENDOR) as string
		}

		// 检测是否为软件渲染
		// 软件渲染器通常包含以下关键词
		const softwareRenderers = [
			"swiftshader",
			"llvmpipe",
			"software",
			"mesa",
			"microsoft basic render",
			"google swiftshader",
		]

		const rendererLower = (renderer || "").toLowerCase()
		const isSoftwareRenderer = softwareRenderers.some((sw) => rendererLower.includes(sw))

		return {
			hardwareAccelerated: !isSoftwareRenderer,
			renderer,
			timestamp: Date.now(),
			vendor,
			webglSupported: true,
			webglVersion,
		}
	} catch (error) {
		console.error("[ExcalidrawEditor] 硬件加速检测失败:", error)
		return result
	}
}

/**
 * 记录硬件加速状态日志
 *
 * 如果硬件加速不可用，记录警告日志并提供解决建议
 *
 * @param status 硬件加速状态
 * @requirements 6.3
 */
export function logHardwareAccelerationStatus(status: HardwareAccelerationStatus): void {
	if (!status.webglSupported) {
		console.warn("[ExcalidrawEditor] WebGL 不可用，Excalidraw 性能可能受影响")
		console.warn("[ExcalidrawEditor] 建议：检查浏览器/WebView 设置，确保 WebGL 已启用")
		return
	}

	if (!status.hardwareAccelerated) {
		console.warn("[ExcalidrawEditor] 硬件加速未启用，使用软件渲染")
		console.warn(`[ExcalidrawEditor] 当前渲染器: ${status.renderer || "未知"}`)
		console.warn("[ExcalidrawEditor] 建议解决方案：")
		console.warn("  1. 检查系统 GPU 驱动是否正常安装")
		console.warn("  2. 在 Tauri 配置中启用硬件加速")
		console.warn("  3. 检查系统是否禁用了 GPU 加速")
		return
	}

	// 硬件加速正常
	console.log(`[ExcalidrawEditor] 硬件加速已启用 (WebGL${status.webglVersion})`)
	console.log(`[ExcalidrawEditor] GPU: ${status.vendor || "未知"} - ${status.renderer || "未知"}`)
}

/**
 * 检测并记录硬件加速状态
 *
 * 组合 detectHardwareAcceleration 和 logHardwareAccelerationStatus
 * 用于组件初始化时调用
 *
 * @returns 硬件加速状态
 * @requirements 6.1, 6.3
 */
export function checkAndLogHardwareAcceleration(): HardwareAccelerationStatus {
	const status = detectHardwareAcceleration()
	logHardwareAccelerationStatus(status)
	return status
}

/**
 * 硬件加速检测缓存
 * 避免重复检测，因为硬件状态在应用运行期间不会改变
 */
let cachedStatus: HardwareAccelerationStatus | null = null

/**
 * 获取硬件加速状态（带缓存）
 *
 * 首次调用时执行检测并缓存结果，后续调用直接返回缓存
 *
 * @returns 硬件加速状态
 */
export function getHardwareAccelerationStatus(): HardwareAccelerationStatus {
	if (!cachedStatus) {
		cachedStatus = checkAndLogHardwareAcceleration()
	}
	return cachedStatus
}

/**
 * 清除硬件加速状态缓存
 * 主要用于测试
 */
export function clearHardwareAccelerationCache(): void {
	cachedStatus = null
}
