/**
 * @file hooks/use-backup-manager.test.ts
 * @description 备份管理 Hook 测试
 */

import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useBackupManager } from "./use-backup-manager"

// Mock dependencies
vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
	},
}))

vi.mock("@/io/log/logger.api", () => ({
	error: vi.fn(),
}))

vi.mock("@/flows/backup", () => ({
	autoBackupManager: {
		start: vi.fn(),
		stop: vi.fn(),
	},
	clearAllData: vi.fn(() => () => Promise.resolve({ _tag: "Right", right: undefined })),
	exportBackupJson: vi.fn(() => () => Promise.resolve({ _tag: "Right", right: undefined })),
	exportBackupZip: vi.fn(() => () => Promise.resolve({ _tag: "Right", right: undefined })),
	getDatabaseStats: vi.fn(
		() => () => Promise.resolve({ _tag: "Right", right: { totalNodes: 10 } }),
	),
	getLocalBackups: vi.fn(() => () => Promise.resolve({ _tag: "Right", right: [] })),
	restoreBackup: vi.fn(() => () => Promise.resolve({ _tag: "Right", right: undefined })),
	restoreLocalBackup: vi.fn(() => () => Promise.resolve({ _tag: "Right", right: undefined })),
}))

vi.mock("@/io/storage/settings.storage", () => ({
	getAutoBackupEnabled: vi.fn(() => false),
	getStorageStats: vi.fn(() => ({ keys: 5, size: 1024 })),
	setAutoBackupEnabled: vi.fn(() => true),
}))

vi.mock("@/io/file/dialog.file", () => ({
	selectFile: vi.fn(() =>
		Promise.resolve({
			cancelled: false,
			file: new File(["test"], "test.json"),
		}),
	),
}))

describe("useBackupManager", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should initialize with default state", async () => {
		const { result } = renderHook(() => useBackupManager())

		expect(result.current.stats).toBeNull()
		expect(result.current.storageStats).toBeNull()
		expect(result.current.loading).toBe(false)
		expect(result.current.autoBackupEnabled).toBe(false)
		expect(result.current.localBackups).toEqual([])

		await waitFor(() => {
			expect(result.current.stats).not.toBeNull()
		})
	})

	it("should load stats on mount", async () => {
		const { result } = renderHook(() => useBackupManager())

		await waitFor(() => {
			expect(result.current.stats).not.toBeNull()
			expect(result.current.storageStats).not.toBeNull()
		})
	})

	it("should export JSON successfully", async () => {
		const { result } = renderHook(() => useBackupManager())

		await waitFor(() => {
			expect(result.current.stats).not.toBeNull()
		})
		await act(async () => {
			await result.current.exportJson()
		})

		await waitFor(() => {
			expect(result.current.loading).toBe(false)
		})
	})

	it("should toggle auto backup", async () => {
		const { result } = renderHook(() => useBackupManager())

		await waitFor(() => {
			expect(result.current.stats).not.toBeNull()
		})
		act(() => {
			result.current.toggleAutoBackup(true)
		})

		await waitFor(() => {
			expect(result.current.autoBackupEnabled).toBe(true)
		})
	})
})
