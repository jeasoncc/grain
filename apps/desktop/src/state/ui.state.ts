/**
 * @file ui.store.ts
 * @description UI 状态管理
 *
 * 管理 UI 状态，包括：
 * - 右侧面板视图
 * - 右侧边栏开关状态
 * - 标签页位置
 * - 应用语言设置
 *
 * 使用 Zustand + Immer 实现不可变状态管理。
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import logger from "@/log";
import type {
	RightPanelView,
	TabPosition,
	UIActions,
	UIState,
} from "@/types/ui";
import { DEFAULT_UI_CONFIG, DEFAULT_UI_STATE } from "@/types/ui";

// ==============================
// Store Type
// ==============================

type UIStore = UIState & UIActions;

// ==============================
// Store Implementation
// ==============================

export const useUIStore = create<UIStore>()(
	persist(
		immer((set) => ({
			// Initial State
			...DEFAULT_UI_STATE,

			// ==============================
			// Actions
			// ==============================

			setRightPanelView: (view: RightPanelView) => {
				logger.info("[Store] 设置右侧面板视图:", view);
				set((state) => {
					state.rightPanelView = view;
				});
			},

			setRightSidebarOpen: (open: boolean) => {
				logger.info("[Store] 设置右侧边栏状态:", open);
				set((state) => {
					state.rightSidebarOpen = open;
				});
			},

			toggleRightSidebar: () => {
				logger.info("[Store] 切换右侧边栏状态");
				set((state) => {
					state.rightSidebarOpen = !state.rightSidebarOpen;
					logger.debug("[Store] 右侧边栏新状态:", state.rightSidebarOpen);
				});
			},

			setTabPosition: (position: TabPosition) => {
				logger.info("[Store] 设置标签页位置:", position);
				set((state) => {
					state.tabPosition = position;
				});
			},

			setLocale: (locale: string) => {
				logger.info("[Store] 设置应用语言:", locale);
				set((state) => {
					state.locale = locale;
				});
			},
		})),
		{
			name: DEFAULT_UI_CONFIG.storageKey,
			partialize: (state) => ({
				// 只持久化这些字段
				rightSidebarOpen: state.rightSidebarOpen,
				tabPosition: state.tabPosition,
				locale: state.locale,
			}),
		},
	),
);

// ==============================
// Selector Hooks
// ==============================

/**
 * 获取当前右侧面板视图
 * 优化：仅在面板视图变化时重新渲染
 */
export const useRightPanelView = (): RightPanelView => {
	return useUIStore((state) => state.rightPanelView);
};

/**
 * 获取右侧边栏是否打开
 * 优化：仅在边栏状态变化时重新渲染
 */
export const useRightSidebarOpen = (): boolean => {
	return useUIStore((state) => state.rightSidebarOpen);
};

/**
 * 获取当前标签页位置
 * 优化：仅在标签页位置变化时重新渲染
 */
export const useTabPosition = (): TabPosition => {
	return useUIStore((state) => state.tabPosition);
};

/**
 * 获取当前应用语言
 * 优化：仅在语言变化时重新渲染
 */
export const useLocale = (): string => {
	return useUIStore((state) => state.locale);
};

/**
 * 检查指定面板视图是否激活
 */
export const useIsPanelViewActive = (view: RightPanelView): boolean => {
	return useUIStore((state) => state.rightPanelView === view);
};

/**
 * 检查标签页是否在顶部
 */
export const useIsTabsAtTop = (): boolean => {
	return useUIStore((state) => state.tabPosition === "top");
};

/**
 * @deprecated 使用 useUIStore 代替。此别名仅为向后兼容提供。
 * 将在未来版本中移除。
 */
export const useUISettingsStore = useUIStore;
