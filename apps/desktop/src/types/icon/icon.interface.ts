/**
 * 图标组件类型定义
 * Icon component type definitions
 *
 * 这个文件定义了图标组件的抽象类型，允许 pipes 层使用而不依赖 React
 * This file defines abstract icon component types for use in pipes layer without React dependency
 */

import type React from "react"

/**
 * 图标组件类型
 * Icon component type - represents any icon component that can be rendered
 *
 * @example
 * const MyIcon: IconComponent = ({ size = 24, color = "currentColor" }) => (
 *   <svg width={size} height={size} fill={color}>...</svg>
 * )
 */
export type IconComponent = React.ComponentType<{
	readonly size?: number
	readonly color?: string
	readonly strokeWidth?: number
}>

/**
 * 图标主题配置
 * Icon theme configuration
 */
export interface IconThemeConfig {
	readonly key: string
	readonly name: string
	readonly icon: IconComponent
}
