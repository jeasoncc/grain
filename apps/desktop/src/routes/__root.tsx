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
import { GlobalSearch } from "@/components/blocks/global-search";
import { BufferSwitcher } from "@/components/buffer-switcher";
import { CommandPalette } from "@/components/command-palette";
import { ExportDialogManager } from "@/components/export/export-dialog-manager";
import { DevtoolsWrapper } from "@/components/devtools-wrapper";
import { FontStyleInjector } from "@/components/font-style-injector";
import { OnboardingTour } from "@/components/onboarding-tour";
import { ConfirmProvider } from "@/components/ui/confirm";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { initializeTheme } from "@/hooks/use-theme";
import { autoBackupManager } from "@/services/backup";
import { useEditorTabsStore } from "@/stores/editor-tabs";
import { useUnifiedSidebarStore } from "@/stores/unified-sidebar";

function RootComponent() {
	const [commandOpen, setCommandOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [bufferSwitcherOpen, setBufferSwitcherOpen] = useState(false);
	const [bufferSwitcherDirection, setBufferSwitcherDirection] = useState<"forward" | "backward">("forward");
	
	// Editor tabs state for buffer switcher
	const tabs = useEditorTabsStore((s) => s.tabs);
	const activeTabId = useEditorTabsStore((s) => s.activeTabId);
	const setActiveTab = useEditorTabsStore((s) => s.setActiveTab);
	
	const {
		activePanel,
		isOpen: unifiedSidebarOpen,
		setActivePanel,
		toggleSidebar,
	} = useUnifiedSidebarStore();

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
			// Ctrl/Cmd + Shift + F 打开搜索面板
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "f") {
				e.preventDefault();
				if (activePanel === "search" && unifiedSidebarOpen) {
					toggleSidebar();
				} else {
					setActivePanel("search");
				}
			}
			// Ctrl/Cmd + B 切换书库面板
			if ((e.ctrlKey || e.metaKey) && e.key === "b") {
				e.preventDefault();
				if (activePanel === "books" && unifiedSidebarOpen) {
					toggleSidebar();
				} else {
					setActivePanel("books");
				}
			}
			// Ctrl + Tab 打开 buffer switcher (forward)
			// Ctrl + Shift + Tab 打开 buffer switcher (backward)
			if (e.ctrlKey && e.key === "Tab") {
				e.preventDefault();
				setBufferSwitcherDirection(e.shiftKey ? "backward" : "forward");
				setBufferSwitcherOpen(true);
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
	}, [activePanel, unifiedSidebarOpen, toggleSidebar, setActivePanel]);

	return (
		<ConfirmProvider>
			<SidebarProvider>
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
					<div className="flex flex-1 ml-12">
						<UnifiedSidebar />
						<div className="bg-background text-foreground flex-1 min-h-svh transition-colors duration-300 ease-in-out overflow-hidden">
							<div className="flex-1 h-full overflow-auto">
								<Outlet />
							</div>
						</div>
					</div>
				</div>
				{/* 命令面板 */}
				<CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
				{/* 全局搜索 */}
				<GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
				{/* Buffer Switcher (Emacs-style tab switching) */}
				<BufferSwitcher
					open={bufferSwitcherOpen}
					onOpenChange={setBufferSwitcherOpen}
					tabs={tabs}
					activeTabId={activeTabId}
					onSelectTab={setActiveTab}
					initialDirection={bufferSwitcherDirection}
				/>
				{/* 导出对话框管理器 */}
				<ExportDialogManager />
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
