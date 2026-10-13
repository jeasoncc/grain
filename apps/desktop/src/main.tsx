import { createRouter, type Router, RouterProvider } from "@tanstack/react-router"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import type { routeTree } from "./routeTree.gen"
import { DetachedOrgWindow, readDetachedOrgWindowBootstrap } from "./views/org-native-window/detached-org-window"
import "./styles.css"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { error, info } from "@/io/log/logger.api"

type AppRouter = Router<typeof routeTree>

const createAppRouter = (tree: typeof routeTree): AppRouter =>
	createRouter({
		context: {},
		defaultPreload: "intent",
		routeTree: tree,
		scrollRestoration: true,
	})

// 类型定义
interface AppConfig {
	readonly router: AppRouter
	readonly queryClient: QueryClient
	readonly isDev: boolean
}

interface RootElement {
	readonly element: HTMLElement
	readonly isEmpty: boolean
}

// 注册类型（类型提示）
declare module "@tanstack/react-router" {
	interface Register {
		readonly router: AppRouter
	}
}

// 纯函数：创建应用配置
const createAppConfig = (tree: typeof routeTree): AppConfig => ({
	isDev: import.meta.env.DEV,
	queryClient: new QueryClient(),
	router: createAppRouter(tree),
})

// 纯函数：获取根元素
const getRootElement = (): O.Option<RootElement> =>
	pipe(
		O.fromNullable(document.getElementById("app")),
		O.map((element) => ({
			element,
			isEmpty: !element.innerHTML,
		})),
	)

// 纯函数：创建 React 应用
const createApp = (config: AppConfig) => (
	<StrictMode>
		<QueryClientProvider client={config.queryClient}>
			<RouterProvider router={config.router} />
		</QueryClientProvider>
	</StrictMode>
)

// IO 函数：渲染应用
const renderApp = (rootElement: RootElement): TE.TaskEither<Error, void> =>
	TE.tryCatch(
		async () => {
			const bootstrap = readDetachedOrgWindowBootstrap()
			const root = ReactDOM.createRoot(rootElement.element)
			if (bootstrap) {
				root.render(<DetachedOrgWindow bootstrap={bootstrap} />)
				return
			}
			// Child projections never load the normal router/default-workspace owner.
			const { routeTree: tree } = await import("./routeTree.gen")
			root.render(createApp(createAppConfig(tree)))
		},
		(error) => new Error(`Failed to render app: ${error}`),
	)

// 主流程：函数式管道
const main = (): TE.TaskEither<Error, void> =>
	pipe(
		getRootElement(),
		O.filter((root) => root.isEmpty),
		O.fold(
			() => TE.left(new Error("Root element not found or already rendered")),
			(rootElement) => renderApp(rootElement),
		),
	)

const nativeChildEntry = new URLSearchParams(window.location.search).has("orgWindow")
// 启动应用
pipe(
	main(),
	TE.fold(
		(appError) => async () => nativeChildEntry
			? console.error("[Native Source] Initialization failed", appError)
			: error("[Main] App initialization failed", { error: appError }),
		() => async () => nativeChildEntry
			? console.info("[Native Source] Projection initialized")
			: info("[Main] App initialized successfully"),
	),
)()
