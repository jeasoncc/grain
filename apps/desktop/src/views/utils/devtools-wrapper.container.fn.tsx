/**
 * @file devtools-wrapper.container.fn.tsx
 * @description Devtools Wrapper - Lazy load TanStack devtools in development
 *
 * 职责：
 * - 仅在开发模式下加载 TanStack Router Devtools
 * - 使用懒加载避免影响生产构建
 *
 * 依赖规则：views/ 只能依赖 hooks/, types/
 */

import { lazy, Suspense } from "react";

// Lazy load TanStack Router Devtools
const TanStackRouterDevtools =
	import.meta.env.MODE === "production"
		? () => null
		: lazy(() =>
				import("@tanstack/react-router-devtools").then((res) => ({
					default: res.TanStackRouterDevtools,
				})),
			);

/**
 * Devtools Wrapper Component
 *
 * Conditionally renders TanStack Router Devtools in development mode.
 * Uses lazy loading to avoid including devtools in production bundle.
 *
 * @returns Devtools component or null
 */
export function DevtoolsWrapper() {
	// Don't render anything in production
	if (import.meta.env.MODE === "production") {
		return null;
	}

	return (
		<Suspense fallback={null}>
			<TanStackRouterDevtools />
		</Suspense>
	);
}
