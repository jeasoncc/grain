/**
 * Monaco Editor 配置
 *
 * 配置 Monaco Editor 的懒加载和 CDN 路径
 * 使用 CDN 加载可以减少初始包体积，提升首次加载速度
 *
 * @requirements 7.1, 7.5 - 性能优化
 */
import { loader } from "@monaco-editor/react";

/**
 * Monaco CDN 版本
 * 使用固定版本确保稳定性
 */
const MONACO_VERSION = "0.52.0";

/**
 * Monaco CDN 基础路径
 * 使用 jsDelivr CDN，国内访问速度较快
 */
const MONACO_CDN_BASE = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs`;

/**
 * 备用 CDN 路径（unpkg）
 * 当主 CDN 不可用时使用
 */
const MONACO_CDN_FALLBACK = `https://unpkg.com/monaco-editor@${MONACO_VERSION}/min/vs`;

/**
 * Monaco 加载配置状态
 */
let isConfigured = false;

/**
 * 配置 Monaco Editor 懒加载
 *
 * 特性：
 * - 使用 CDN 加载 Monaco 核心文件，减少打包体积
 * - 支持 Web Workers 提升编辑器性能
 * - 配置只执行一次，避免重复配置
 *
 * @example
 * ```tsx
 * // 在应用入口或组件中调用
 * configureMonacoLoader();
 * ```
 */
export const configureMonacoLoader = (): void => {
	// 避免重复配置
	if (isConfigured) {
		return;
	}

	loader.config({
		paths: {
			vs: MONACO_CDN_BASE,
		},
		// Monaco 配置选项
		"vs/nls": {
			// 使用英文界面，避免加载额外的语言包
			availableLanguages: {},
		},
	});

	isConfigured = true;
};

/**
 * 使用备用 CDN 配置 Monaco
 *
 * 当主 CDN 加载失败时调用
 */
export const configureMonacoFallback = (): void => {
	loader.config({
		paths: {
			vs: MONACO_CDN_FALLBACK,
		},
	});
};

/**
 * 获取 Monaco 加载状态
 */
export const isMonacoConfigured = (): boolean => isConfigured;

/**
 * 预加载 Monaco Editor
 *
 * 在空闲时预加载 Monaco，提升后续使用时的响应速度
 * 使用 requestIdleCallback 在浏览器空闲时执行
 *
 * @example
 * ```tsx
 * // 在应用启动后调用
 * preloadMonaco();
 * ```
 */
export const preloadMonaco = (): void => {
	// 确保已配置
	configureMonacoLoader();

	// 使用 requestIdleCallback 在空闲时预加载
	if (typeof window !== "undefined" && "requestIdleCallback" in window) {
		window.requestIdleCallback(
			() => {
				// 触发 Monaco 加载
				loader.init().catch(() => {
					// 主 CDN 失败，尝试备用 CDN
					configureMonacoFallback();
					loader.init().catch(console.error);
				});
			},
			{ timeout: 5000 },
		);
	} else {
		// 降级：使用 setTimeout
		setTimeout(() => {
			loader.init().catch(() => {
				configureMonacoFallback();
				loader.init().catch(console.error);
			});
		}, 1000);
	}
};
