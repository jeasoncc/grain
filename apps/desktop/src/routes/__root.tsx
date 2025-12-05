import { createRootRoute, Outlet } from "@tanstack/react-router";
import {
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ActivityBar } from "@/components/activity-bar";
import { AppSidebar } from "@/components/app-sidebar";
import { SearchSidebar } from "@/components/search-sidebar";
import { GlobalSearch } from "@/components/blocks/global-search";
import { BottomDrawer } from "@/components/bottom-drawer";
import { BottomDrawerContent } from "@/components/bottom-drawer-content";
import { CommandPalette } from "@/components/command-palette";
import { DevtoolsWrapper } from "@/components/devtools-wrapper";
import { FontStyleInjector } from "@/components/font-style-injector";
import { OnboardingTour } from "@/components/onboarding-tour";
import { ConfirmProvider } from "@/components/ui/confirm";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { initializeTheme } from "@/hooks/use-theme";
import { autoBackupManager } from "@/services/backup";

function RootComponent() {
	const [commandOpen, setCommandOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [searchSidebarOpen, setSearchSidebarOpen] = useState(false);
	
	// 侧边栏默认状态：从 localStorage 读取，默认关闭
	const [sidebarOpen, setSidebarOpen] = useState(() => {
		const saved = localStorage.getItem("sidebar-open");
		return saved ? saved === "true" : false;
	});

	// 保存侧边栏状态到 localStorage
	useEffect(() => {
		localStorage.setItem("sidebar-open", String(sidebarOpen));
	}, [sidebarOpen]);

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
			// 注意：Ctrl/Cmd + B 由 SidebarProvider 内置处理
		};

		// 监听自定义事件（从命令面板触发）
		const handleOpenSearch = () => setSearchOpen(true);
		const handleToggleSearchSidebar = () => setSearchSidebarOpen((prev) => !prev);
		
		window.addEventListener("open-global-search", handleOpenSearch);
		window.addEventListener("toggle-search-sidebar", handleToggleSearchSidebar);
		window.addEventListener("keydown", handleKeyDown);
		
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("open-global-search", handleOpenSearch);
			window.removeEventListener("toggle-search-sidebar", handleToggleSearchSidebar);
		};
	}, []);

	return (
		<ConfirmProvider>
			<SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
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
					{/* 搜索侧边栏 */}
					{searchSidebarOpen && (
						<div className="w-80 shrink-0">
							<SearchSidebar />
						</div>
					)}
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
				{/* TanStack Devtools - 仅在开发模式下显示 */}
				{import.meta.env.DEV && <DevtoolsWrapper />}
			</SidebarProvider>
		</ConfirmProvider>
	);
}

export const Route = createRootRoute({
	component: RootComponent,
});
