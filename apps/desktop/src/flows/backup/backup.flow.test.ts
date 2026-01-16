/**
 * @file flows/backup/backup.flow.test.ts
 * @description 备份流程单元测试
 *
 * 测试范围：
 * - 备份创建和恢复流程
 * - 错误处理
 * - 本地备份管理
 * - 自动备份功能
 *
 * 需求: 2.3
 */

import dayjs from "dayjs"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { DatabaseStats } from "@/types/backup"
import type { BackupInfo } from "@/types/rust-api"
import {
	createAutoBackupManager,
	getDatabaseStats,
	getLastBackupTime,
	getLocalBackups,
	restoreLocalBackup,
	saveLocalBackup,
	shouldAutoBackup,
} from "./backup.flow"

// Mock localStorage
const mockLocalStorage = {
	clear: vi.fn(),
	getItem: vi.fn(),
	setItem: vi.fn(),
}
Object.defineProperty(globalThis, "localStorage", {
	value: mockLocalStorage,
})

// Mock window.setInterval and clearInterval
const mockSetInterval = vi.fn()
const mockClearInterval = vi.fn()

Object.defineProperty(globalThis, "setInterval", {
	value: mockSetInterval,
})
Object.defineProperty(globalThis, "clearInterval", {
	value: mockClearInterval,
})

// Mock window object for the backup flow
Object.defineProperty(globalThis, "window", {
	value: {
		clearInterval: mockClearInterval,
		setInterval: mockSetInterval,
	},
})

describe("backup.flow", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockLocalStorage.getItem.mockReturnValue(null)
	})

	describe("getDatabaseStats", () => {
		it("should return default database stats", async () => {
			const expectedStats: DatabaseStats = {
				attachmentCount: 0,
				contentCount: 0,
				drawingCount: 0,
				nodeCount: 0,
				projectCount: 0,
				tagCount: 0,
				userCount: 0,
			}

			const result = await getDatabaseStats()()

			expect(result).toEqual({
				_tag: "Right",
				right: expectedStats,
			})
		})
	})

	describe("getLocalBackups", () => {
		it("should return empty array when no backups stored", async () => {
			mockLocalStorage.getItem.mockReturnValue(null)

			const result = await getLocalBackups()()

			expect(result).toEqual({
				_tag: "Right",
				right: [],
			})
			expect(mockLocalStorage.getItem).toHaveBeenCalledWith("auto-backups")
		})

		it("should return stored backups", async () => {
			const mockBackups = [
				{
					data: {
						attachments: [],
						contents: [],
						dbVersions: [],
						drawings: [],
						metadata: {
							appVersion: "0.1.89",
							contentCount: 5,
							nodeCount: 5,
							projectCount: 1,
							tagCount: 2,
							timestamp: "2024-01-01T12:00:00Z",
							version: "5.0.0",
						},
						nodes: [],
						tags: [],
						users: [],
						workspaces: [],
					},
					timestamp: "2024-01-01T12:00:00Z",
				},
			]
			mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockBackups))

			const result = await getLocalBackups()()

			expect(result).toEqual({
				_tag: "Right",
				right: mockBackups,
			})
		})

		it("should handle localStorage error", async () => {
			mockLocalStorage.getItem.mockImplementation(() => {
				throw new Error("localStorage error")
			})

			const result = await getLocalBackups()()

			expect(result._tag).toBe("Left")
			expect(result._tag === "Left" && result.left.type).toBe("DB_ERROR")
		})
	})

	describe("saveLocalBackup", () => {
		it("should save backup to localStorage", async () => {
			const mockBackupInfo: BackupInfo = {
				createdAt: new Date("2024-01-01T12:00:00Z").getTime(),
				filename: "backup_20240101_120000.json",
				path: "/path/to/backup_20240101_120000.json",
				size: 1024,
			}
			mockLocalStorage.getItem.mockReturnValue("[]")

			const result = await saveLocalBackup(mockBackupInfo)()

			expect(result).toEqual({
				_tag: "Right",
				right: undefined,
			})
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				"auto-backups",
				expect.stringContaining("2024-01-01T12:00:00"),
			)
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				"last-auto-backup",
				"2024-01-01T12:00:00.000Z",
			)
		})

		it("should limit backups to maxBackups", async () => {
			const existingBackups = Array.from({ length: 5 }, (_, i) => ({
				data: {
					attachments: [],
					contents: [],
					dbVersions: [],
					drawings: [],
					metadata: {
						appVersion: "0.1.89",
						contentCount: 0,
						nodeCount: 0,
						projectCount: 0,
						tagCount: 0,
						timestamp: `2024-01-0${i + 1}T12:00:00Z`,
						version: "5.0.0",
					},
					nodes: [],
					tags: [],
					users: [],
					workspaces: [],
				},
				timestamp: `2024-01-0${i + 1}T12:00:00Z`,
			}))
			mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingBackups))

			const mockBackupInfo: BackupInfo = {
				createdAt: new Date("2024-01-06T12:00:00Z").getTime(),
				filename: "backup_20240106_120000.json",
				path: "/path/to/backup_20240106_120000.json",
				size: 1024,
			}

			const result = await saveLocalBackup(mockBackupInfo, 3)()

			expect(result).toEqual({
				_tag: "Right",
				right: undefined,
			})

			// Verify that only 3 backups are kept
			const savedData = mockLocalStorage.setItem.mock.calls.find(
				(call) => call[0] === "auto-backups",
			)?.[1]
			const parsedData = JSON.parse(savedData as string)
			expect(parsedData).toHaveLength(3)
		})

		it("should handle localStorage error during save", async () => {
			mockLocalStorage.getItem.mockReturnValue("[]")
			mockLocalStorage.setItem.mockImplementation(() => {
				throw new Error("localStorage error")
			})

			const mockBackupInfo: BackupInfo = {
				createdAt: new Date("2024-01-01T12:00:00Z").getTime(),
				filename: "backup_20240101_120000.json",
				path: "/path/to/backup_20240101_120000.json",
				size: 1024,
			}

			const result = await saveLocalBackup(mockBackupInfo)()

			expect(result._tag).toBe("Left")
			expect(result._tag === "Left" && result.left.type).toBe("DB_ERROR")
		})
	})

	describe("restoreLocalBackup", () => {
		it("should handle backup not found", async () => {
			mockLocalStorage.getItem.mockReturnValue("[]")

			const result = await restoreLocalBackup("2024-01-01T12:00:00Z")()

			expect(result._tag).toBe("Left")
			expect(result._tag === "Left" && result.left.type).toBe("IMPORT_ERROR")
		})
	})

	describe("getLastBackupTime", () => {
		it("should return last backup time", () => {
			const timestamp = "2024-01-01T12:00:00Z"
			mockLocalStorage.getItem.mockReturnValue(timestamp)

			const result = getLastBackupTime()

			expect(result).toBe(timestamp)
			expect(mockLocalStorage.getItem).toHaveBeenCalledWith("last-auto-backup")
		})

		it("should return null when no last backup", () => {
			mockLocalStorage.getItem.mockReturnValue(null)

			const result = getLastBackupTime()

			expect(result).toBeNull()
		})
	})

	describe("shouldAutoBackup", () => {
		it("should return true when no last backup", () => {
			mockLocalStorage.getItem.mockReturnValue(null)

			const result = shouldAutoBackup()

			expect(result).toBe(true)
		})

		it("should return true when interval exceeded", () => {
			const oldTime = dayjs().subtract(25, "hour").toISOString()
			mockLocalStorage.getItem.mockReturnValue(oldTime)

			const result = shouldAutoBackup(24)

			expect(result).toBe(true)
		})

		it("should return false when interval not exceeded", () => {
			const recentTime = dayjs().subtract(1, "hour").toISOString()
			mockLocalStorage.getItem.mockReturnValue(recentTime)

			const result = shouldAutoBackup(24)

			expect(result).toBe(false)
		})
	})

	describe("createAutoBackupManager", () => {
		it("should create auto backup manager with start/stop functionality", () => {
			const manager = createAutoBackupManager()

			expect(manager).toHaveProperty("start")
			expect(manager).toHaveProperty("stop")
			expect(manager).toHaveProperty("getLocalBackups")
		})

		it("should start auto backup interval", () => {
			const manager = createAutoBackupManager()

			manager.start(1) // 1 hour interval

			expect(mockSetInterval).toHaveBeenCalledWith(
				expect.any(Function),
				1 * 60 * 60 * 1000, // 1 hour in milliseconds
			)
		})

		it("should stop auto backup interval", () => {
			const manager = createAutoBackupManager()
			mockSetInterval.mockReturnValue(123)

			manager.start()
			manager.stop()

			expect(mockClearInterval).toHaveBeenCalledWith(123)
		})

		it("should not start multiple intervals", () => {
			const manager = createAutoBackupManager()

			manager.start()
			manager.start()

			expect(mockSetInterval).toHaveBeenCalledTimes(1)
		})
	})
})
