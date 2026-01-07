import { Outlet, createRootRoute } from "@tanstack/react-router";
import { AppLayout } from "@/views/app-layout";
import { ConfirmProvider } from "@/views/ui/confirm";

export const Route = createRootRoute({
	component: RootComponent,
});

function RootComponent() {
	// AppLayout 和 ActivityBar 会自动处理工作区加载和初始化
	// 不需要在这里等待工作区加载
	return (
		<ConfirmProvider>
			<AppLayout>
				<Outlet />
			</AppLayout>
		</ConfirmProvider>
	);
}
