/**
 * ExcalidrawEditor 组件类型定义
 *
 * 独立包类型定义，不依赖 apps/desktop 的内部类型
 */

/**
 * Excalidraw 数据结构
 */
export interface ExcalidrawData {
	readonly elements: readonly unknown[];
	readonly appState: Record<string, unknown>;
	readonly files: Record<string, unknown>;
}

/**
 * 性能配置接口
 *
 * 定义所有性能相关的配置参数类型
 */
export interface PerformanceConfig {
	/** 自动保存延迟时间（毫秒） */
	readonly AUTO_SAVE_DELAY: number;
	/** 保存状态更新节流间隔（毫秒） */
	readonly STATUS_UPDATE_THROTTLE: number;
	/** ResizeObserver 防抖延迟（毫秒） */
	readonly RESIZE_DEBOUNCE_DELAY: number;
	/** 尺寸变化阈值（像素） */
	readonly SIZE_CHANGE_THRESHOLD: number;
	/** 最小有效尺寸（像素） */
	readonly MIN_VALID_SIZE: number;
	/** 初始布局等待时间（毫秒） */
	readonly INITIAL_LAYOUT_DELAY: number;
	/** 保存失败重试延迟（毫秒） */
	readonly SAVE_RETRY_DELAY: number;
	/** 最大保存重试次数 */
	readonly MAX_SAVE_RETRIES: number;
}

/**
 * 性能指标接口（用于调试和监控）
 *
 * 记录组件运行时的性能数据
 */
export interface PerformanceMetrics {
	/** 组件渲染次数 */
	readonly renderCount: number;
	/** 最后一次渲染时间戳 */
	readonly lastRenderTime: number;
	/** 保存操作次数 */
	readonly saveCount: number;
	/** resize 事件次数 */
	readonly resizeCount: number;
	/** onChange 事件次数 */
	readonly onChangeCount: number;
	/** 平均帧率（FPS） */
	readonly averageFps?: number;
}

/**
 * 容器尺寸类型
 */
export interface ContainerSize {
	readonly width: number;
	readonly height: number;
}

/**
 * ExcalidrawEditorView Props 接口
 *
 * 纯展示组件：所有数据和回调通过 props 传入
 */
export interface ExcalidrawEditorViewProps {
	/** 初始数据 */
	readonly initialData: ExcalidrawData | null;
	/** 主题：light 或 dark */
	readonly theme: "light" | "dark";
	/** 内容变化回调 */
	readonly onChange?: (
		elements: readonly unknown[],
		appState: Record<string, unknown>,
		files: Record<string, unknown>,
	) => void;
	/** 手动保存回调 (Ctrl+S) */
	readonly onSave?: () => void;
	/** 是否为只读模式 */
	readonly viewModeEnabled?: boolean;
	/** 容器尺寸 - 必须使用固定像素值 */
	readonly containerSize: ContainerSize;
}
