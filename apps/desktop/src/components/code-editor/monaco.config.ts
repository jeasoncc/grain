/**
 * Monaco Editor 配置
 *
 * 配置 Monaco Editor 从本地加载（不使用 CDN）
 * 适用于离线桌面应用场景
 *
 * @requirements 7.1, 7.5 - 性能优化
 */
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// 配置 Monaco Editor Worker
// 这是让 Monaco 在本地正常工作的关键配置
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

/**
 * Monaco 加载配置状态
 */
let isConfigured = false;

/**
 * 配置 Monaco Editor 本地加载
 *
 * 特性：
 * - 从本地 node_modules 加载 Monaco，支持离线使用
 * - 不依赖外部 CDN，适合桌面应用
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

	// 配置 Monaco Worker
	// 对于简单的代码编辑（PlantUML、Mermaid），只需要基础的 editor worker
	self.MonacoEnvironment = {
		getWorker(_: unknown, _label: string) {
			return new editorWorker();
		},
	};

	// 使用本地 monaco-editor 实例
	loader.config({ monaco });

	isConfigured = true;
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
				loader.init().catch(console.error);
			},
			{ timeout: 5000 },
		);
	} else {
		// 降级：使用 setTimeout
		setTimeout(() => {
			loader.init().catch(console.error);
		}, 1000);
	}
};
