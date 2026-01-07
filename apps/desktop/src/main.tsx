import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import "./styles.css";
import "@grain/editor-lexical/styles";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { legacyDatabase } from "@/io/db/legacy-database";

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
	// Legacy database opens automatically in constructor
	// No need to call open() or initDatabase() - Rust backend handles initialization

	// 确保数据库操作完成后再渲染应用
	const rootElement = document.getElementById("app");
	if (rootElement && !rootElement.innerHTML) {
		const root = ReactDOM.createRoot(rootElement);
		root.render(
			<StrictMode>
				<QueryClientProvider client={queryClient}>
					<RouterProvider router={router} />
					{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
				</QueryClientProvider>
			</StrictMode>,
		);
	}
}

main();
