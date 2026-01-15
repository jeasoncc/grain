/**
 * SaveStatusIndicator 组件类型定义
 */

/**
 * SaveStatusIndicatorView Props 接口
 *
 * 纯展示组件：所有数据通过 props 传入
 */
export interface SaveStatusIndicatorViewProps {
	/** 样式类名 */
	readonly className?: string
	/** 是否显示最后保存时间 */
	readonly showLastSaveTime?: boolean
	/** 保存状态 */
	readonly status: "saved" | "saving" | "error" | "unsaved"
	/** 最后保存时间戳 */
	readonly lastSaveTime: number | null
	/** 错误信息 */
	readonly errorMessage: string | null
	/** 是否有未保存的更改 */
	readonly hasUnsavedChanges: boolean
	/** 是否正在手动保存 */
	readonly isManualSaving: boolean
}
