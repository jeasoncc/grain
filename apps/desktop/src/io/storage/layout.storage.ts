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

import * as E from "fp-ts/Either"
import { z } from "zod"
import { info, error as logError, warn } from "@/io/log/logger.api"
import type { LayoutState } from "@/types/layout"
import { DEFAULT_LAYOUT_STATE } from "@/types/layout"
import { SIDEBAR_PANELS } from "@/types/sidebar"

// ============================================================================
// 存储键
// ============================================================================

export const LAYOUT_STORAGE_KEY = "grain-layout-state"

// ============================================================================
// Zod Schema
// ============================================================================

/**
 * Layout state schema for validation
 * 使用 SIDEBAR_PANELS 常量确保与类型定义同步
 */
const LayoutStateSchema = z.object({
	isSidebarOpen: z.boolean(),
	activePanel: z.enum(SIDEBAR_PANELS),
	wasCollapsedByDrag: z.boolean(),
	sidebarWidth: z.number().min(15).max(40),
})

// ============================================================================
// Storage Operations
// ============================================================================

/**
 * Save layout state to localStorage
 *
 * @param state - Layout state to save
 * @returns Either<Error, void>
 */
export function saveLayoutState(state: LayoutState): E.Either<Error, void> {
	return E.tryCatch(
		() => {
			localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(state))
			info("[Layout Storage] State saved", { state }, "layout.storage")
		},
		(err) => {
			logError("[Layout Storage] Failed to save state", { error: err }, "layout.storage")
			return new Error(`[Layout Storage] Failed to save state: ${String(err)}`)
		},
	)
}

/**
 * Load layout state from localStorage
 *
 * @returns Validated layout state or default state if invalid/missing
 */
export function loadLayoutState(): LayoutState {
	const result = E.tryCatch(
		() => {
			const stored = localStorage.getItem(LAYOUT_STORAGE_KEY)

			if (!stored) {
				info("[Layout Storage] No saved state found, using default")
				return DEFAULT_LAYOUT_STATE
			}

			const parsed: unknown = JSON.parse(stored)
			const validation = LayoutStateSchema.safeParse(parsed)

			if (validation.success) {
				info("[Layout Storage] State loaded", { data: validation.data }, "layout.storage")
				return validation.data
			}

			warn("[Layout Storage] Invalid state format, using default:", { error: validation.error })
			return DEFAULT_LAYOUT_STATE
		},
		(err) => {
			logError("[Layout Storage] Failed to load state", { error: err }, "layout.storage")
			return new Error(`[Layout Storage] Failed to load state: ${String(err)}`)
		},
	)

	return E.getOrElse(() => DEFAULT_LAYOUT_STATE)(result)
}

/**
 * Clear layout state from localStorage
 *
 * @returns Either<Error, void>
 */
export function clearLayoutState(): E.Either<Error, void> {
	return E.tryCatch(
		() => {
			localStorage.removeItem(LAYOUT_STORAGE_KEY)
			info("[Layout Storage] State cleared")
		},
		(err) => {
			logError("[Layout Storage] Failed to clear state", { error: err }, "layout.storage")
			return new Error(`[Layout Storage] Failed to clear state: ${String(err)}`)
		},
	)
}

/**
 * Check if layout state exists in localStorage
 *
 * @returns Whether state exists
 */
export function hasLayoutState(): boolean {
	const result = E.tryCatch(
		() => localStorage.getItem(LAYOUT_STORAGE_KEY) !== null,
		(err) => {
			logError("[Layout Storage] Failed to check state", { error: err }, "layout.storage")
			return new Error(`[Layout Storage] Failed to check state: ${String(err)}`)
		},
	)

	return E.getOrElse(() => false)(result)
}
