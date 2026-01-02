/**
 * @file save-status-indicator.container.fn.tsx
 * @description 保存状态指示器容器组件
 *
 * 根据当前活动 Tab 从 SaveServiceManager 获取正确的保存状态
 * 解决 Tab 切换时状态不更新的问题
 */

import { memo, useSyncExternalStore } from "react";
import { saveServiceManager } from "@/lib/save-service-manager";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";
import { useSaveStore } from "@/stores/save.store";
import type { SaveStatusIndicatorViewProps } from "./save-status-indicator.types";
import { SaveStatusIndicatorView } from "./save-status-indicator.view.fn";

// ============================================================================
// Types
// ============================================================================

export interface SaveStatusIndicatorContainerProps {
	/** 样式类名 */
	readonly className?: string;
	/** 是否显示最后保存时间 */
	readonly showLastSaveTime?: boolean;
}

// ============================================================================
// 订阅 SaveServiceManager 状态变化
// ============================================================================

/**
 * 创建订阅函数，用于 useSyncExternalStore
 * 由于 saveServiceManager 没有内置订阅机制，我们使用轮询方式
 * 实际上状态变化会通过 SaveStore 触发重渲染
 */
const subscribe = (callback: () => void) => {
	// SaveStore 的状态变化会触发重渲染
	// 这里返回一个空的 unsubscribe 函数
	return () => {};
};

// ============================================================================
// Container Component
// ============================================================================

export const SaveStatusIndicatorContainer = memo(
	({ className, showLastSaveTime }: SaveStatusIndicatorContainerProps) => {
		// 获取当前活动 Tab
		const activeTabId = useEditorTabsStore((s) => s.activeTabId);
		const tabs = useEditorTabsStore((s) => s.tabs);
		const activeTab = tabs.find((t) => t.id === activeTabId);
		const activeNodeId = activeTab?.nodeId;

		// 从全局 SaveStore 获取状态（用于 saving/error 等状态）
		const {
			status: globalStatus,
			lastSaveTime,
			errorMessage,
			isManualSaving,
		} = useSaveStore();

		// 根据当前活动 Tab 计算 hasUnsavedChanges
		// 如果没有活动 Tab，显示无未保存更改
		const hasUnsavedChanges = activeNodeId
			? saveServiceManager.hasUnsavedChanges(activeNodeId)
			: false;

		// 计算最终显示的状态
		// 如果当前 Tab 没有未保存更改，但全局状态是 unsaved，则显示 saved
		const effectiveStatus: SaveStatusIndicatorViewProps["status"] =
			globalStatus === "unsaved" && !hasUnsavedChanges ? "saved" : globalStatus;

		return (
			<SaveStatusIndicatorView
				className={className}
				showLastSaveTime={showLastSaveTime}
				status={effectiveStatus}
				lastSaveTime={lastSaveTime}
				errorMessage={errorMessage}
				hasUnsavedChanges={hasUnsavedChanges}
				isManualSaving={isManualSaving}
			/>
		);
	},
);

SaveStatusIndicatorContainer.displayName = "SaveStatusIndicatorContainer";
