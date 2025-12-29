// Devtools 包装组件
// 仅在开发模式下加载和显示 TanStack Devtools

import { useEffect, useState } from "react";
import logger from "@/log";

// 类型定义
type DevtoolsModules = {
	TanStackRouterDevtoolsPanel: React.ComponentType;
} | null;

export function DevtoolsWrapper() {
	const [devtoolsModules, setDevtoolsModules] = useState<DevtoolsModules>(null);

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
				logger.warn("Failed to load Devtools:", error);
			});
	}, []);

	// 仅在开发模式下渲染
	if (!import.meta.env.DEV || !devtoolsModules) {
		return null;
	}

	const { TanStackRouterDevtoolsPanel } = devtoolsModules;

	return <TanStackRouterDevtoolsPanel />;
}
