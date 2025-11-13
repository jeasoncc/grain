import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { db, initDatabase } from "./db/curd";

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
}

main();

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
