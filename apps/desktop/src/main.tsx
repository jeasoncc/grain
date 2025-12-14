import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { db, initDatabase } from "./db/curd";
import { cleanupAllDrawings } from "./services/drawings";

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
	await db.open(); // 打开数据库
	await initDatabase(); // 初始化默认数据
	
	// 清理绘图数据中的异常值，防止 "Canvas exceeds max size" 错误
	await cleanupAllDrawings();
	
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
	}
}

main();
