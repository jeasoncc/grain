// Devtools 包装组件
// 仅在开发模式下加载和显示 TanStack Devtools

import { useEffect, useState } from "react";

// 类型定义
type DevtoolsModules = {
	TanStackDevtools: React.ComponentType<any>;
	TanStackRouterDevtoolsPanel: React.ComponentType<any>;
	FormDevtoolsPlugin: () => any;
} | null;

export function DevtoolsWrapper() {
	const [devtoolsModules, setDevtoolsModules] = useState<DevtoolsModules>(null);

	useEffect(() => {
		// 仅在开发环境下动态加载 Devtools
		// Vite 会在生产构建时进行 tree-shaking
		if (!import.meta.env.DEV) {
			return;
		}

		// 动态导入 Devtools（仅在开发环境）
		Promise.all([
			import("@tanstack/react-devtools"),
			import("@tanstack/react-router-devtools"),
			import("@tanstack/react-form-devtools"),
		])
			.then(([devtools, routerDevtools, formDevtools]) => {
				setDevtoolsModules({
					TanStackDevtools: devtools.TanStackDevtools,
					TanStackRouterDevtoolsPanel: routerDevtools.TanStackRouterDevtoolsPanel,
					FormDevtoolsPlugin: formDevtools.FormDevtoolsPlugin,
				});
			})
			.catch((error) => {
				// 静默失败（开发环境下可能缺少依赖）
				console.warn("Failed to load Devtools:", error);
			});
	}, []);

	// 仅在开发模式下渲染
	if (!import.meta.env.DEV || !devtoolsModules) {
		return null;
	}

	const { TanStackDevtools, TanStackRouterDevtoolsPanel, FormDevtoolsPlugin } = devtoolsModules;

	return (
		<TanStackDevtools
			config={{
				position: "top-right",
			}}
			plugins={[
				{
					name: "Tanstack Router",
					render: <TanStackRouterDevtoolsPanel />,
				},
				FormDevtoolsPlugin(),
			]}
		/>
	);
}
