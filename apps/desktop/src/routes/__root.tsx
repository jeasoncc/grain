/**
 * @file __root.tsx
 * @description 应用根路由组件
 *
 * 职责：
 * - 提供应用布局结构
 * - 初始化全局状态（布局、主题）
 * - 渲染全局组件（命令面板、搜索、通知等）
 * - 设置全局键盘快捷键
 *
 * 依赖规则：routes/ 只能依赖 views/, hooks/, types/
 */

import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useWorkspaces } from "@/hooks/queries";
import { useEditorTabs } from "@/hooks/use-editor-tabs";
import { useGlobalUI } from "@/hooks/use-global-ui";
import { useLayout, useLayoutInit } from "@/hooks/use-layout";
import { useThemeInitialization } from "@/hooks/use-theme";
import { useSelectedWorkspaceId } from "@/state/selection.state";
import { AppLayout } from "@/views/app-layout";
import { BufferSwitcherContainer } from "@/views/buffer-switcher";
import { CommandPaletteContainer } from "@/views/command-palette";
import { ExportDialogManagerContainer } from "@/views/export-dialog-manager";
import { GlobalSearchContainer } from "@/views/global-search";
import { ConfirmProvider } from "@/views/ui/confirm";
import { Toaster } from "@/views/ui/sonner";
import { DevtoolsWrapper } from "@/views/utils/devtools-wrapper.container.fn";
import { FontStyleInjector } from "@/views/utils/font-style-injector";

export const Route = createRootRoute({
	component: RootComponent,
});

function RootComponent() {
	// ==============================
	// Initialization
	// ==============================

	// Initialize layout state from localStorage
	useLayoutInit();

	// Initialize theme system (applies theme and sets up listeners)
	useThemeInitialization();

	// ==============================
	// Data Hooks
	// ==============================

	// Workspace data
	const { data: workspaces = [] } = useWorkspaces();
	const selectedWorkspaceId = useSelectedWorkspaceId();

	// Editor tabs data
	const { tabs, activeTabId, setActiveTab } = useEditorTabs();

	// ==============================
	// Global UI State
	// ==============================

	const { commandPalette, globalSearch, bufferSwitcher } = useGlobalUI();

	// Layout actions (获取在组件顶层，避免在事件处理器中调用 getState)
	const { toggleSidebar } = useLayout();

	// ==============================
	// Global Keyboard Shortcuts
	// ==============================

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Detect Mac platform using userAgent (platform is deprecated)
			const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);
			const modKey = isMac ? e.metaKey : e.ctrlKey;

			// Cmd/Ctrl+K - Toggle Command Palette
			if (modKey && e.key === "k") {
				e.preventDefault();
				commandPalette.toggle();
				return;
			}

			// Cmd/Ctrl+Shift+F - Toggle Global Search
			if (modKey && e.shiftKey && e.key === "F") {
				e.preventDefault();
				globalSearch.toggle();
				return;
			}

			// Cmd/Ctrl+B - Toggle Sidebar (Files Panel)
			if (modKey && e.key === "b") {
				e.preventDefault();
				toggleSidebar();
				return;
			}

			// Ctrl+Tab - Forward Buffer Switcher
			if (e.ctrlKey && e.key === "Tab" && !e.shiftKey) {
				e.preventDefault();
				bufferSwitcher.open("forward");
				return;
			}

			// Ctrl+Shift+Tab - Backward Buffer Switcher
			if (e.ctrlKey && e.key === "Tab" && e.shiftKey) {
				e.preventDefault();
				bufferSwitcher.open("backward");
				return;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [commandPalette, globalSearch, bufferSwitcher, toggleSidebar]);

	// ==============================
	// Render
	// ==============================

	return (
		<ConfirmProvider>
			{/* Font Style Injector - Applies custom font settings */}
			<FontStyleInjector />

			{/* Main Layout */}
			<AppLayout>
				<Outlet />
			</AppLayout>

			{/* Global Components */}
			<Toaster />
			<CommandPaletteContainer
				open={commandPalette.isOpen}
				onOpenChange={(isOpen) => {
					if (isOpen) {
						commandPalette.open();
					} else {
						commandPalette.close();
					}
				}}
				workspaces={workspaces}
				selectedWorkspaceId={selectedWorkspaceId}
			/>
			<GlobalSearchContainer
				open={globalSearch.isOpen}
				onOpenChange={(isOpen) => {
					if (isOpen) {
						globalSearch.open();
					} else {
						globalSearch.close();
					}
				}}
			/>
			<BufferSwitcherContainer
				open={bufferSwitcher.isOpen}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						bufferSwitcher.close();
					}
				}}
				tabs={tabs}
				activeTabId={activeTabId}
				onSelectTab={setActiveTab}
				initialDirection={bufferSwitcher.direction}
			/>
			<ExportDialogManagerContainer
				selectedWorkspaceId={selectedWorkspaceId}
				workspaces={workspaces}
			/>

			{/* Devtools - Only in development */}
			<DevtoolsWrapper />
		</ConfirmProvider>
	);
}
