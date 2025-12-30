/**
 * Excalidraw 编辑器性能配置常量
 *
 * 集中管理所有性能相关的配置参数，便于调优和维护
 *
 * @requirements 3.4, 4.1, 5.3
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
 * 性能配置类型
 * 从常量对象推导出类型
 */
export type ExcalidrawPerformanceConfig = typeof EXCALIDRAW_PERFORMANCE_CONFIG;

/**
 * 性能配置键类型
 */
export type ExcalidrawPerformanceConfigKey =
	keyof typeof EXCALIDRAW_PERFORMANCE_CONFIG;
