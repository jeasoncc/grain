/**
 * Excalidraw 编辑器性能配置常量
 *
 * 集中管理所有性能相关的配置参数，便于调优和维护
 *
 * @requirements 3.4, 4.1, 5.3, 6.4
 */

/**
 * 性能配置常量
 *
 * 使用 `as const` 确保类型安全和不可变性
 */
export const EXCALIDRAW_PERFORMANCE_CONFIG = {
	/**
	 * 自动保存延迟时间（毫秒）
	 * 用于 debounce onChange 事件，避免频繁保存
	 * @requirements 5.3
	 */
	AUTO_SAVE_DELAY: 2000,

	/**
	 * 保存状态更新节流间隔（毫秒）
	 * 限制 markAsUnsaved/markAsSaving/markAsSaved 的调用频率
	 * @requirements 3.4
	 */
	STATUS_UPDATE_THROTTLE: 500,

	/**
	 * ResizeObserver 防抖延迟（毫秒）
	 * 等待容器尺寸稳定后再更新
	 * @requirements 4.1
	 */
	RESIZE_DEBOUNCE_DELAY: 200,

	/**
	 * 尺寸变化阈值（像素）
	 * 只有当尺寸变化超过此阈值时才触发更新
	 * @requirements 4.2
	 */
	SIZE_CHANGE_THRESHOLD: 10,

	/**
	 * 最小有效尺寸（像素）
	 * 容器尺寸必须大于此值才被视为有效
	 */
	MIN_VALID_SIZE: 200,

	/**
	 * 初始布局等待时间（毫秒）
	 * 等待 DOM 布局稳定后再获取初始尺寸
	 */
	INITIAL_LAYOUT_DELAY: 100,

	/**
	 * 保存失败重试延迟（毫秒）
	 */
	SAVE_RETRY_DELAY: 1000,

	/**
	 * 最大保存重试次数
	 */
	MAX_SAVE_RETRIES: 1,
} as const;

/**
 * Excalidraw UIOptions 配置
 *
 * 优化 UI 选项以减少不必要的 UI 元素，提升性能
 * @requirements 6.4
 */
export const EXCALIDRAW_UI_OPTIONS = {
	/**
	 * Canvas 操作配置
	 * 禁用不需要的功能以减少 UI 复杂度
	 */
	canvasActions: {
		/** 禁用加载场景功能（我们使用自己的文件管理） */
		loadScene: false,
		/** 禁用保存到活动文件（我们使用自己的保存逻辑） */
		saveToActiveFile: false,
		/** 禁用导出功能（可以通过其他方式导出） */
		export: false,
		/** 禁用清除画布按钮（防止误操作） */
		clearCanvas: false,
		/** 禁用主题切换（由应用控制） */
		toggleTheme: false,
	},
	/**
	 * 欢迎屏幕配置
	 * 禁用欢迎屏幕以加快加载速度
	 */
	welcomeScreen: false,
} as const;

/**
 * Excalidraw 渲染优化配置
 *
 * 针对 Tauri WebView 的最优渲染设置
 * @requirements 6.4
 */
export const EXCALIDRAW_RENDER_CONFIG = {
	/**
	 * 是否检测滚动
	 * 在 Tauri 中通常不需要，可以禁用以提升性能
	 */
	detectScroll: true,

	/**
	 * 是否全局处理键盘事件
	 * 禁用以避免与应用其他快捷键冲突
	 */
	handleKeyboardGlobally: false,

	/**
	 * 是否自动聚焦
	 * 禁用以避免页面加载时的焦点问题
	 */
	autoFocus: false,
} as const;

/**
 * 性能配置类型
 * 从常量对象推导出类型
 */
export type ExcalidrawPerformanceConfig = typeof EXCALIDRAW_PERFORMANCE_CONFIG;

/**
 * 性能配置键类型
 */
export type ExcalidrawPerformanceConfigKey =
	keyof typeof EXCALIDRAW_PERFORMANCE_CONFIG;

/**
 * UIOptions 类型
 */
export type ExcalidrawUIOptions = typeof EXCALIDRAW_UI_OPTIONS;

/**
 * 渲染配置类型
 */
export type ExcalidrawRenderConfig = typeof EXCALIDRAW_RENDER_CONFIG;
