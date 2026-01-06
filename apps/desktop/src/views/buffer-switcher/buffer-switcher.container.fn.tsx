/**
 * Buffer Switcher Container - 处理键盘导航和状态管理
 */

import { memo, useCallback, useEffect, useState } from "react";
import type { BufferSwitcherContainerProps } from "./buffer-switcher.types";
import { BufferSwitcherView } from "./buffer-switcher.view.fn";

/**
 * Buffer Switcher 容器组件
 * 负责键盘事件处理和选中索引管理
 */
export const BufferSwitcherContainer = memo(
	({
		open,
		onOpenChange,
		tabs,
		activeTabId,
		onSelectTab,
		initialDirection = "forward",
	}: BufferSwitcherContainerProps) => {
		const [selectedIndex, setSelectedIndex] = useState(0);

		// 初始化选中索引
		useEffect(() => {
			if (open && tabs.length > 0) {
				const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
				if (initialDirection === "forward") {
					setSelectedIndex((currentIndex + 1) % tabs.length);
				} else {
					setSelectedIndex((currentIndex - 1 + tabs.length) % tabs.length);
				}
			}
		}, [open, tabs, activeTabId, initialDirection]);

		// Keyboard Navigation - Tab 键切换
		const handleKeyDown = useCallback(
			(e: KeyboardEvent) => {
				if (!open) return;

				if (e.key === "Tab" && e.ctrlKey) {
					e.preventDefault();
					if (e.shiftKey) {
						setSelectedIndex((prev) => (prev - 1 + tabs.length) % tabs.length);
					} else {
						setSelectedIndex((prev) => (prev + 1) % tabs.length);
					}
				}
			},
			[open, tabs.length],
		);

		// Keyboard Navigation - Ctrl 释放时确认选择
		const handleKeyUp = useCallback(
			(e: KeyboardEvent) => {
				if (!open) return;

				if (e.key === "Control") {
					// 释放 Ctrl 时确认选择
					if (tabs[selectedIndex]) {
						onSelectTab(tabs[selectedIndex].id);
					}
					onOpenChange(false);
				}
			},
			[open, tabs, selectedIndex, onSelectTab, onOpenChange],
		);

		// 注册键盘事件监听
		useEffect(() => {
			window.addEventListener("keydown", handleKeyDown);
			window.addEventListener("keyup", handleKeyUp);
			return () => {
				window.removeEventListener("keydown", handleKeyDown);
				window.removeEventListener("keyup", handleKeyUp);
			};
		}, [handleKeyDown, handleKeyUp]);

		// 处理点击选择
		const handleTabClick = useCallback(
			(tabId: string) => {
				onSelectTab(tabId);
				onOpenChange(false);
			},
			[onSelectTab, onOpenChange],
		);

		return (
			<BufferSwitcherView
				open={open}
				onOpenChange={onOpenChange}
				tabs={tabs}
				selectedIndex={selectedIndex}
				onSelectTab={onSelectTab}
				onTabClick={handleTabClick}
			/>
		);
	},
);

BufferSwitcherContainer.displayName = "BufferSwitcherContainer";
