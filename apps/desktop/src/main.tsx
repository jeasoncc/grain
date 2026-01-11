import {
	createRouter,
	type Router,
	RouterProvider,
} from "@tanstack/react-router";
import { pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import "./styles.css";
import "@grain/editor-lexical/styles";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// 类型定义
interface AppConfig {
	readonly router: ReturnType<typeof createRouter>;
	readonly queryClient: QueryClient;
	readonly isDev: boolean;
}

interface RootElement {
	readonly element: HTMLElement;
	readonly isEmpty: boolean;
}

// 注册类型（类型提示）
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof Router;
	}
}

// 纯函数：创建应用配置
const createAppConfig = (): AppConfig => ({
	router: createRouter({
		routeTree,
		context: {},
		defaultPreload: "intent",
		scrollRestoration: true,
	}),
	queryClient: new QueryClient(),
	isDev: import.meta.env.DEV,
});

// 纯函数：获取根元素
const getRootElement = (): O.Option<RootElement> =>
	pipe(
		O.fromNullable(document.getElementById("app")),
		O.map((element) => ({
			element,
			isEmpty: !element.innerHTML,
		})),
	);

// 纯函数：创建 React 应用
const createApp = (config: AppConfig) => (
	<StrictMode>
		<QueryClientProvider client={config.queryClient}>
			<RouterProvider router={config.router} />
			{config.isDev && (
				<ReactQueryDevtools
					initialIsOpen={false}
					buttonPosition="bottom-left"
				/>
			)}
		</QueryClientProvider>
	</StrictMode>
);

// IO 函数：渲染应用
const renderApp = (
	rootElement: RootElement,
	config: AppConfig,
): TE.TaskEither<Error, void> =>
	TE.tryCatch(
		async () => {
			const root = ReactDOM.createRoot(rootElement.element);
			root.render(createApp(config));
		},
		(error) => new Error(`Failed to render app: ${error}`),
	);

// 主流程：函数式管道
const main = (): TE.TaskEither<Error, void> =>
	pipe(createAppConfig(), (config) =>
		pipe(
			getRootElement(),
			O.filter((root) => root.isEmpty),
			O.fold(
				() => TE.left(new Error("Root element not found or already rendered")),
				(rootElement) => renderApp(rootElement, config),
			),
		),
	);

// 启动应用
pipe(
	main(),
	TE.fold(
		(error) => async () => console.error("App initialization failed:", error),
		() => async () => console.log("App initialized successfully"),
	),
)();
