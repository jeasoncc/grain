/**
 * @file devtools-wrapper.container.fn.tsx
 * @description Devtools 包装容器组件
 *
 * 仅在开发模式下加载和显示 TanStack Router Devtools。
 * 使用动态导入实现生产环境的 tree-shaking。
 */

import { memo, useEffect, useState } from "react";
import logger from "@/log";

// 类型定义
type DevtoolsModules = {
	readonly TanStackRouterDevtoolsPanel: React.ComponentType;
} | null;

/**
 * Devtools 包装容器组件
 * 仅在开发环境下渲染 TanStack Router Devtools
 */
export const DevtoolsWrapperContainer = memo(
	function DevtoolsWrapperContainer() {
		const [devtoolsModules, setDevtoolsModules] =
			useState<DevtoolsModules>(null);

		useEffect(() => {
			// 仅在开发环境下动态加载 Devtools
			// Vite 会在生产构建时进行 tree-shaking
			if (!import.meta.env.DEV) {
				return;
			}

			// 动态导入 Router Devtools（仅在开发环境）
			import("@tanstack/react-router-devtools")
				.then((routerDevtools) => {
					setDevtoolsModules({
						TanStackRouterDevtoolsPanel:
							routerDevtools.TanStackRouterDevtoolsPanel,
					});
				})
				.catch((error) => {
					// 静默失败（开发环境下可能缺少依赖）
					logger.warn("[Devtools] 加载失败:", error);
				});
		}, []);

		// 仅在开发模式下渲染
		if (!import.meta.env.DEV || !devtoolsModules) {
			return null;
		}

		const { TanStackRouterDevtoolsPanel } = devtoolsModules;

		return <TanStackRouterDevtoolsPanel />;
	},
);

// 默认导出
export { DevtoolsWrapperContainer as DevtoolsWrapper };
