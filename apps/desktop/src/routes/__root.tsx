import { Outlet, createRootRoute } from "@tanstack/react-router";
import { AppLayout } from "@/views/app-layout";
import { useAllWorkspaces } from "@/hooks/use-workspace";
import { ConfirmProvider } from "@/views/ui/confirm";
import { Spinner } from "@/views/ui/loading";

export const Route = createRootRoute({
	component: RootComponent,
});

function RootComponent() {
	const workspaces = useAllWorkspaces();

	// 加载中状态
	if (workspaces === undefined) {
		return (
			<div className="flex h-screen w-screen items-center justify-center">
				<Spinner />
			</div>
		);
	}

	// 无工作区状态（等待 ActivityBar 自动创建）
	if (workspaces.length === 0) {
		return (
			<div className="flex h-screen w-screen items-center justify-center">
				<Spinner />
			</div>
		);
	}

	// 正常状态：显示完整布局
	return (
		<ConfirmProvider>
			<AppLayout workspaces={workspaces}>
				<Outlet />
			</AppLayout>
		</ConfirmProvider>
	);
}
