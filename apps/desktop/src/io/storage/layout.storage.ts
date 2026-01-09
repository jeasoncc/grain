/**
 * @file io/storage/layout.storage.ts
 * @description Layout 状态持久化存储
 *
 * 职责：提供布局状态的 localStorage 读写操作
 * 依赖：types/
 *
 * 设计原则：
 * - 入口窄：使用 Zod Schema 校验读取的数据
 * - 出口宽：写入时容错处理
 * - 纯函数风格：无副作用的数据转换
 */

import { z } from "zod";
import logger from "@/io/log";
import type { LayoutState } from "@/types/layout";
import { DEFAULT_LAYOUT_STATE } from "@/types/layout";

// ============================================================================
// 存储键
// ============================================================================

export const LAYOUT_STORAGE_KEY = "grain-layout-state";

// ============================================================================
// Zod Schema
// ============================================================================

/**
 * Layout state schema for validation
 */
const LayoutStateSchema = z.object({
	isSidebarOpen: z.boolean(),
	activePanel: z.enum(["files", "search", "drawings", "tags"]).nullable(),
	wasCollapsedByDrag: z.boolean(),
	sidebarWidth: z.number().min(15).max(40),
});

// ============================================================================
// Storage Operations
// ============================================================================

/**
 * Save layout state to localStorage
 *
 * @param state - Layout state to save
 * @returns Whether save was successful
 */
export function saveLayoutState(state: LayoutState): boolean {
	try {
		localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(state));
		logger.info("[Layout Storage] State saved", state);
		return true;
	} catch (error) {
		logger.error("[Layout Storage] Failed to save state:", error);
		return false;
	}
}

/**
 * Load layout state from localStorage
 *
 * @returns Validated layout state or default state if invalid/missing
 */
export function loadLayoutState(): LayoutState {
	try {
		const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);

		if (!stored) {
			logger.info(
				"[Layout Storage] No saved state found, using default",
			);
			return DEFAULT_LAYOUT_STATE;
		}

		const parsed = JSON.parse(stored);
		const result = LayoutStateSchema.safeParse(parsed);

		if (result.success) {
			logger.info("[Layout Storage] State loaded", result.data);
			return result.data;
		}

		logger.warn(
			"[Layout Storage] Invalid state format, using default:",
			result.error,
		);
		return DEFAULT_LAYOUT_STATE;
	} catch (error) {
		logger.error("[Layout Storage] Failed to load state:", error);
		return DEFAULT_LAYOUT_STATE;
	}
}

/**
 * Clear layout state from localStorage
 *
 * @returns Whether clear was successful
 */
export function clearLayoutState(): boolean {
	try {
		localStorage.removeItem(LAYOUT_STORAGE_KEY);
		logger.info("[Layout Storage] State cleared");
		return true;
	} catch (error) {
		logger.error("[Layout Storage] Failed to clear state:", error);
		return false;
	}
}

/**
 * Check if layout state exists in localStorage
 *
 * @returns Whether state exists
 */
export function hasLayoutState(): boolean {
	try {
		return localStorage.getItem(LAYOUT_STORAGE_KEY) !== null;
	} catch (error) {
		logger.error("[Layout Storage] Failed to check state:", error);
		return false;
	}
}
