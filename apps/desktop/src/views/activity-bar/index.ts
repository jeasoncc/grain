/**
 * @file index.ts
 * @description ActivityBar 模块导出
 *
 * 导出 ActivityBar 组件及其类型定义。
 * - ActivityBar: 容器组件（编排层），用于路由组件中
 * - ActivityBarView: 纯展示组件，可用于测试或自定义场景
 */

// 容器组件（默认导出）
export { ActivityBarContainer as ActivityBar } from "./activity-bar.container.fn";
// 类型定义
export type {
	ActionButtonProps,
	ActivityBarProps,
	NavItemProps,
	ToggleNavItemProps,
	WorkspaceItemProps,
} from "./activity-bar.types";
// 纯展示组件
export { ActivityBarView } from "./activity-bar.view.fn";
