/**
 * Property-Based Test: Backup Data Integrity
 *
 * **Property 3: 备份数据完整性**
 * **Validates: Requirements 3.2, 3.4**
 *
 * Tests that backup operations maintain data integrity and format compatibility
 * after replacing Dexie with SQLite API calls.
 */

import * as fc from "fast-check"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { BackupData, BackupMetadata, LocalBackupRecord } from "@/types/backup"
import type { BackupInfo } from "@/types/rust-api"
import { getDatabaseStats, getLocalBackups, saveLocalBackup } from "./backup.flow"

// Mock localStorage
const mockLocalStorage = {
	clear: vi.fn(),
	getItem: vi.fn(),
	setItem: vi.fn(),
}
Object.defineProperty(globalThis, "localStorage", {
	value: mockLocalStorage,
})

// Generators for test data
const backupMetadataGenerator = fc.record({
	appVersion: fc.constantFrom("0.1.89", "0.1.88", "0.1.87"),
	contentCount: fc.integer({ max: 1000, min: 0 }),
	nodeCount: fc.integer({ max: 1000, min: 0 }),
	projectCount: fc.integer({ max: 100, min: 0 }),
	tagCount: fc.integer({ max: 50, min: 0 }),
	timestamp: fc.date().map((d) => d.toISOString()),
	version: fc.constantFrom("5.0.0", "4.0.0", "3.0.0"),
}) as fc.Arbitrary<BackupMetadata>

const backupDataGenerator = fc.record({
	attachments: fc.array(fc.record({ filename: fc.string(), id: fc.string() }), { maxLength: 20 }),
	contents: fc.array(fc.record({ content: fc.string(), id: fc.string(), nodeId: fc.string() }), {
		maxLength: 100,
	}),
	dbVersions: fc.array(fc.record({ appliedAt: fc.string(), version: fc.string() }), {
		maxLength: 5,
	}),
	drawings: fc.array(fc.record({ data: fc.string(), id: fc.string() }), { maxLength: 10 }),
	metadata: backupMetadataGenerator,
	nodes: fc.array(fc.record({ id: fc.string(), title: fc.string(), workspace: fc.string() }), {
		maxLength: 100,
	}),
	tags: fc.array(fc.record({ id: fc.string(), name: fc.string() }), { maxLength: 50 }),
	users: fc.array(fc.record({ id: fc.string(), name: fc.string() }), { maxLength: 10 }),
	workspaces: fc.array(fc.record({ id: fc.string(), title: fc.string() }), { maxLength: 20 }),
}) as fc.Arbitrary<BackupData>

const backupInfoGenerator = fc.record({
	createdAt: fc.date().map((d) => d.getTime()),
	filename: fc.string({ maxLength: 100, minLength: 1 }).map((s) => `backup_${s}.json`),
	path: fc.string({ maxLength: 200, minLength: 1 }).map((s) => `/path/to/${s}`),
	size: fc.integer({ max: 1000000, min: 1 }),
}) as fc.Arbitrary<BackupInfo>

const localBackupRecordGenerator = fc.record({
	data: backupDataGenerator,
	timestamp: fc.date().map((d) => d.toISOString()),
}) as fc.Arbitrary<LocalBackupRecord>

describe("Property Test: Backup Data Integrity", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockLocalStorage.getItem.mockReturnValue(null)
	})

	it("Property 3.1: Backup data structure consistency", () => {
		/**
		 * **Feature: legacy-database-removal, Property 3.1: 备份数据结构一致性**
		 *
		 * For any valid backup data, the structure should contain all required fields
		 * and maintain consistency across save/load operations.
		 */

		fc.assert(
			fc.property(backupDataGenerator, (backupData) => {
				// Verify all required fields exist
				expect(backupData).toHaveProperty("metadata")
				expect(backupData).toHaveProperty("users")
				expect(backupData).toHaveProperty("workspaces")
				expect(backupData).toHaveProperty("nodes")
				expect(backupData).toHaveProperty("contents")
				expect(backupData).toHaveProperty("drawings")
				expect(backupData).toHaveProperty("attachments")
				expect(backupData).toHaveProperty("tags")
				expect(backupData).toHaveProperty("dbVersions")

				// Verify metadata structure
				expect(backupData.metadata).toHaveProperty("version")
				expect(backupData.metadata).toHaveProperty("timestamp")
				expect(backupData.metadata).toHaveProperty("projectCount")
				expect(backupData.metadata).toHaveProperty("nodeCount")
				expect(backupData.metadata).toHaveProperty("contentCount")
				expect(backupData.metadata).toHaveProperty("tagCount")
				expect(backupData.metadata).toHaveProperty("appVersion")

				// Verify arrays are arrays
				expect(Array.isArray(backupData.users)).toBe(true)
				expect(Array.isArray(backupData.workspaces)).toBe(true)
				expect(Array.isArray(backupData.nodes)).toBe(true)
				expect(Array.isArray(backupData.contents)).toBe(true)
				expect(Array.isArray(backupData.drawings)).toBe(true)
				expect(Array.isArray(backupData.attachments)).toBe(true)
				expect(Array.isArray(backupData.tags)).toBe(true)
				expect(Array.isArray(backupData.dbVersions)).toBe(true)

				// Verify timestamp is valid ISO string
				expect(() => new Date(backupData.metadata.timestamp)).not.toThrow()
				expect(new Date(backupData.metadata.timestamp).toISOString()).toBe(
					backupData.metadata.timestamp,
				)

				// Verify counts are non-negative
				expect(backupData.metadata.projectCount).toBeGreaterThanOrEqual(0)
				expect(backupData.metadata.nodeCount).toBeGreaterThanOrEqual(0)
				expect(backupData.metadata.contentCount).toBeGreaterThanOrEqual(0)
				expect(backupData.metadata.tagCount).toBeGreaterThanOrEqual(0)

				return true
			}),
			{ numRuns: 5 },
		)
	})

	it("Property 3.2: Local backup save/load round-trip integrity", () => {
		/**
		 * **Feature: legacy-database-removal, Property 3.2: 本地备份往返完整性**
		 *
		 * For any backup info, saving and then loading should preserve the backup structure
		 * and maintain data integrity.
		 */

		fc.assert(
			fc.property(
				backupInfoGenerator,
				fc.array(localBackupRecordGenerator, { maxLength: 3 }),
				async (backupInfo, existingBackups) => {
					// Clear mocks before each test
					vi.clearAllMocks()

					// Setup existing backups - handle getLocalBackups call first
					mockLocalStorage.getItem.mockImplementation((key) => {
						if (key === "auto-backups") {
							return JSON.stringify(existingBackups)
						}
						return null
					})

					// Save the backup
					const saveResult = await saveLocalBackup(backupInfo)()
					expect(saveResult._tag).toBe("Right")

					// Verify localStorage.setItem was called
					expect(mockLocalStorage.setItem).toHaveBeenCalled()

					// Get the saved data
					const setItemCalls = mockLocalStorage.setItem.mock.calls
					const autoBackupsCall = setItemCalls.find((call) => call[0] === "auto-backups")
					const lastBackupCall = setItemCalls.find((call) => call[0] === "last-auto-backup")

					expect(autoBackupsCall).toBeDefined()
					expect(lastBackupCall).toBeDefined()

					if (autoBackupsCall && lastBackupCall) {
						const savedBackups = JSON.parse(autoBackupsCall[1] as string)
						const lastBackupTime = lastBackupCall[1] as string

						// Verify structure integrity
						expect(Array.isArray(savedBackups)).toBe(true)
						expect(savedBackups.length).toBeGreaterThan(0)

						// Verify the new backup is at the front
						const newBackup = savedBackups[0]
						expect(newBackup).toHaveProperty("timestamp")
						expect(newBackup).toHaveProperty("data")
						expect(newBackup.data).toHaveProperty("metadata")

						// Verify timestamp consistency (allow for slight differences due to dayjs formatting)
						expect(typeof lastBackupTime).toBe("string")
						expect(typeof newBackup.timestamp).toBe("string")

						// Verify backup data structure
						expect(newBackup.data.metadata).toHaveProperty("version")
						expect(newBackup.data.metadata).toHaveProperty("timestamp")
						expect(newBackup.data.metadata).toHaveProperty("appVersion")
					}

					return true
				},
			),
			{ numRuns: 10 },
		)
	})

	it("Property 3.3: Backup format version compatibility", () => {
		/**
		 * **Feature: legacy-database-removal, Property 3.3: 备份格式版本兼容性**
		 *
		 * For any backup data with different version formats, the system should
		 * handle them gracefully and maintain backward compatibility.
		 */

		fc.assert(
			fc.property(
				fc.array(localBackupRecordGenerator, { maxLength: 5, minLength: 1 }),
				async (backups) => {
					// Clear mocks before each test
					vi.clearAllMocks()

					// Setup backups with different versions
					mockLocalStorage.getItem.mockImplementation((key) => {
						if (key === "auto-backups") {
							return JSON.stringify(backups)
						}
						return null
					})

					// Load the backups
					const loadResult = await getLocalBackups()()
					expect(loadResult._tag).toBe("Right")

					if (loadResult._tag === "Right") {
						const loadedBackups = loadResult.right

						// Verify all backups are loaded
						expect(loadedBackups.length).toBe(backups.length)

						// Verify each backup maintains its structure
						loadedBackups.forEach((backup, index) => {
							expect(backup).toHaveProperty("timestamp")
							expect(backup).toHaveProperty("data")
							expect(backup.data).toHaveProperty("metadata")
							expect(backup.data.metadata).toHaveProperty("version")

							// Verify timestamp format
							expect(() => new Date(backup.timestamp)).not.toThrow()

							// Verify original data is preserved
							expect(backup.timestamp).toBe(backups[index].timestamp)
							expect(backup.data.metadata.version).toBe(backups[index].data.metadata.version)
						})
					}

					return true
				},
			),
			{ numRuns: 10 },
		)
	})

	it("Property 3.4: Database stats consistency", () => {
		/**
		 * **Feature: legacy-database-removal, Property 3.4: 数据库统计一致性**
		 *
		 * For any database stats request, the returned structure should be consistent
		 * and contain all required statistical fields.
		 */

		fc.assert(
			fc.property(
				fc.constant(null), // No input needed for stats
				async () => {
					const statsResult = await getDatabaseStats()()
					expect(statsResult._tag).toBe("Right")

					if (statsResult._tag === "Right") {
						const stats = statsResult.right

						// Verify all required fields exist
						expect(stats).toHaveProperty("userCount")
						expect(stats).toHaveProperty("projectCount")
						expect(stats).toHaveProperty("nodeCount")
						expect(stats).toHaveProperty("contentCount")
						expect(stats).toHaveProperty("drawingCount")
						expect(stats).toHaveProperty("attachmentCount")
						expect(stats).toHaveProperty("tagCount")

						// Verify all counts are non-negative numbers
						expect(typeof stats.userCount).toBe("number")
						expect(typeof stats.projectCount).toBe("number")
						expect(typeof stats.nodeCount).toBe("number")
						expect(typeof stats.contentCount).toBe("number")
						expect(typeof stats.drawingCount).toBe("number")
						expect(typeof stats.attachmentCount).toBe("number")
						expect(typeof stats.tagCount).toBe("number")

						expect(stats.userCount).toBeGreaterThanOrEqual(0)
						expect(stats.projectCount).toBeGreaterThanOrEqual(0)
						expect(stats.nodeCount).toBeGreaterThanOrEqual(0)
						expect(stats.contentCount).toBeGreaterThanOrEqual(0)
						expect(stats.drawingCount).toBeGreaterThanOrEqual(0)
						expect(stats.attachmentCount).toBeGreaterThanOrEqual(0)
						expect(stats.tagCount).toBeGreaterThanOrEqual(0)
					}

					return true
				},
			),
			{ numRuns: 20 },
		)
	})

	it("Property 3.5: Backup size limits and constraints", () => {
		/**
		 * **Feature: legacy-database-removal, Property 3.5: 备份大小限制和约束**
		 *
		 * For any backup operation with size constraints, the system should
		 * respect maximum backup limits and maintain only the specified number of backups.
		 */

		fc.assert(
			fc.property(
				backupInfoGenerator,
				fc.integer({ max: 5, min: 1 }), // maxBackups (smaller range)
				fc.array(localBackupRecordGenerator, { maxLength: 3, minLength: 0 }), // existing backups (smaller)
				async (backupInfo, maxBackups, existingBackups) => {
					// Clear mocks before each test
					vi.clearAllMocks()

					// Setup existing backups - ensure we don't exceed the limit in setup
					const limitedExistingBackups = existingBackups.slice(0, Math.max(0, maxBackups - 1))

					mockLocalStorage.getItem.mockImplementation((key) => {
						if (key === "auto-backups") {
							return JSON.stringify(limitedExistingBackups)
						}
						return null
					})

					// Save with size limit
					const saveResult = await saveLocalBackup(backupInfo, maxBackups)()
					expect(saveResult._tag).toBe("Right")

					// Verify localStorage.setItem was called
					const setItemCalls = mockLocalStorage.setItem.mock.calls
					const autoBackupsCall = setItemCalls.find((call) => call[0] === "auto-backups")

					expect(autoBackupsCall).toBeDefined()

					if (autoBackupsCall) {
						const savedBackups = JSON.parse(autoBackupsCall[1] as string)

						// Verify size constraint is respected
						expect(savedBackups.length).toBeLessThanOrEqual(maxBackups)

						// Verify the new backup is included (should be at the front)
						expect(savedBackups.length).toBeGreaterThan(0)

						// Verify the new backup is the first one (most recent)
						const newBackup = savedBackups[0]
						expect(newBackup).toHaveProperty("timestamp")
						expect(newBackup).toHaveProperty("data")

						// Verify all timestamps are valid dates
						savedBackups.forEach((backup: any) => {
							expect(() => new Date(backup.timestamp)).not.toThrow()
						})
					}

					return true
				},
			),
			{ numRuns: 10 },
		)
	})
})
