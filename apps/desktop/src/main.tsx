import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import "./styles.css";
import "@grain/editor-lexical/styles";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { preloadMonaco } from "./components/code-editor/monaco.config";
import { database } from "./db/database";
import { initDatabase } from "./db/init.db.fn";

// 开发环境下的调试工具已移除

// Create the router instance
const router = createRouter({
	routeTree,
	context: {},
	defaultPreload: "intent",
	scrollRestoration: true,
});

// 注册类型（类型提示）
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

// 创建 QueryClient
const queryClient = new QueryClient();

async function main() {
	await database.open(); // 打开数据库
	await initDatabase(); // 初始化默认数据

	// 确保数据库操作完成后再渲染应用
	const rootElement = document.getElementById("app");
	if (rootElement && !rootElement.innerHTML) {
		const root = ReactDOM.createRoot(rootElement);
		root.render(
			<StrictMode>
				<QueryClientProvider client={queryClient}>
					<RouterProvider router={router} />
				</QueryClientProvider>
			</StrictMode>,
		);

		// 在应用渲染后，空闲时预加载 Monaco Editor
		// 这样可以减少首次打开代码编辑器时的加载时间
		preloadMonaco();
	}
}

main();
