/**
 * ExcalidrawEditor 组件类型定义
 *
 * @requirements 5.2
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
	/** 是否为只读模式 */
	readonly viewModeEnabled?: boolean;
	/** 容器尺寸 - 必须使用固定像素值 */
	readonly containerSize: ContainerSize;
}

/**
 * ExcalidrawEditorContainer Props 接口
 */
export interface ExcalidrawEditorContainerProps {
	/** 节点 ID */
	readonly nodeId: string;
	/** 样式类名 */
	readonly className?: string;
}
