import { TanStackDevtools } from "@tanstack/react-devtools";
import { FormDevtoolsPlugin } from "@tanstack/react-form-devtools";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ActivityBar } from "@/components/activity-bar";
import { BottomDrawer } from "@/components/bottom-drawer";
import { BottomDrawerContent } from "@/components/bottom-drawer-content";
import { CommandPalette } from "@/components/command-palette";
import { FontStyleInjector } from "@/components/font-style-injector";
import { OnboardingTour } from "@/components/onboarding-tour";
import { GlobalSearch } from "@/components/blocks/global-search";
import { ConfirmProvider } from "@/components/ui/confirm";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { initializeTheme } from "@/hooks/use-theme";
import {
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { useState, useEffect } from "react";
import { autoBackupManager } from "@/services/backup";

function RootComponent() {
	const [commandOpen, setCommandOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);

	// 初始化主题系统（包括系统主题监听）
	useEffect(() => {
		const cleanup = initializeTheme();
		return () => cleanup?.();
	}, []);

	// 初始化自动备份
	useEffect(() => {
		const enabled = localStorage.getItem("auto-backup-enabled") === "true";
		if (enabled) {
			autoBackupManager.start();
		}
		return () => autoBackupManager.stop();
	}, []);

	// 全局快捷键
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Ctrl/Cmd + K 打开命令面板
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				setCommandOpen(true);
			}
			// Ctrl/Cmd + Shift + F 打开全局搜索
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "f") {
				e.preventDefault();
				setSearchOpen(true);
			}
		};

		// 监听自定义事件（从命令面板触发）
		const handleOpenSearch = () => setSearchOpen(true);
		window.addEventListener("open-global-search", handleOpenSearch);

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("open-global-search", handleOpenSearch);
		};
	}, []);

	return (
		<ConfirmProvider>
			<SidebarProvider open>
				<Toaster
					icons={{
						success: <CircleCheckIcon className="size-4 text-green-500" />,
						info: <InfoIcon className="size-4 text-blue-500" />,
						warning: <TriangleAlertIcon className="size-4 text-yellow-500" />,
						error: <OctagonXIcon className="size-4 text-red-500" />,
						loading: (
							<Loader2Icon className="size-4 animate-spin text-muted-foreground" />
						),
					}}
				/>
				<div className="flex min-h-screen w-full">
					<ActivityBar />
					<AppSidebar />
					<SidebarInset className="bg-background text-foreground flex-1 min-h-svh transition-colors duration-300 ease-in-out">
						<div className="flex-1 min-h-0 overflow-auto">
							<Outlet />
						</div>
					</SidebarInset>
					{/* 底部抽屉 */}
					<BottomDrawer>
						<BottomDrawerContent />
					</BottomDrawer>
				</div>
				{/* 命令面板 */}
				<CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
				{/* 全局搜索 */}
				<GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
				{/* 字体样式注入 */}
				<FontStyleInjector />
				{/* 新手引导 */}
				<OnboardingTour />
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
			</SidebarProvider>
		</ConfirmProvider>
	);
}

export const Route = createRootRoute({
	component: RootComponent,
});
