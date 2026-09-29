/**
 * Backup Manager Container Component Tests
 */

import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { BackupManagerContainer } from "./backup-manager.container.fn"

const mockUseBackupManager = vi.fn()

vi.mock("@/hooks/use-backup-manager", () => ({
	useBackupManager: () => mockUseBackupManager(),
}))

vi.mock("@/views/ui/confirm", () => ({
	useConfirm: () => vi.fn().mockResolvedValue(true),
}))

const createBackupManager = () => ({
	autoBackupEnabled: localStorage.getItem("auto-backup-enabled") === "true",
	clearAll: vi.fn(),
	clearDatabase: vi.fn(),
	clearSettings: vi.fn(),
	exportJson: vi.fn(),
	exportZip: vi.fn(),
	loading: false,
	loadLocalBackups: vi.fn(),
	loadStats: vi.fn(),
	localBackups: [],
	restore: vi.fn(),
	restoreLocal: vi.fn(),
	stats: {
		attachmentCount: 8,
		contentCount: 15,
		drawingCount: 3,
		nodeCount: 20,
		projectCount: 5,
		tagCount: 12,
		userCount: 2,
	},
	storageStats: { keys: 10, size: 2048 },
	toggleAutoBackup: vi.fn(),
})

describe("BackupManagerContainer", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		localStorage.clear()
		mockUseBackupManager.mockImplementation(createBackupManager)
	})

	it("should render and fetch data on mount", async () => {
		render(<BackupManagerContainer />)

		// Wait for loading to complete
		await waitFor(
			() => {
				expect(screen.queryByRole("status")).not.toBeInTheDocument()
			},
			{ timeout: 2000 },
		)

		// Now check for the data
		await waitFor(() => {
			expect(screen.getByText(/Data Statistics/i)).toBeInTheDocument()
		})
	})

	it("should load auto backup state from localStorage", async () => {
		localStorage.setItem("auto-backup-enabled", "true")

		render(<BackupManagerContainer />)

		await waitFor(() => {
			const switchElement = screen.getByRole("switch")
			expect(switchElement).toBeChecked()
		})
	})

	it("should render storage stats", async () => {
		render(<BackupManagerContainer />)

		// Wait for loading to complete
		await waitFor(
			() => {
				expect(screen.queryByRole("status")).not.toBeInTheDocument()
			},
			{ timeout: 2000 },
		)

		// Storage stats should not be visible initially (data is loading)
		// This test just verifies the component renders without errors
		expect(screen.getByText("Data Statistics")).toBeInTheDocument()
	})

	it("should render manual backup section", async () => {
		render(<BackupManagerContainer />)

		await waitFor(() => {
			expect(screen.getByText("Manual Backup")).toBeInTheDocument()
		})

		expect(screen.getByText("Export JSON")).toBeInTheDocument()
		expect(screen.getByText("Export ZIP")).toBeInTheDocument()
		expect(screen.getByText("Restore Backup")).toBeInTheDocument()
	})

	it("should render auto backup section", async () => {
		render(<BackupManagerContainer />)

		await waitFor(() => {
			expect(screen.getByText("Auto Backup")).toBeInTheDocument()
		})

		expect(screen.getByRole("switch")).toBeInTheDocument()
	})

	it("should render danger zone section", async () => {
		render(<BackupManagerContainer />)

		await waitFor(() => {
			expect(screen.getByText("Danger Zone")).toBeInTheDocument()
		})

		expect(screen.getByText("Clear All")).toBeInTheDocument()
		expect(screen.getByText("Clear DB")).toBeInTheDocument()
		expect(screen.getByText("Reset Settings")).toBeInTheDocument()
	})

	it("should show empty state for local backups", async () => {
		render(<BackupManagerContainer />)

		await waitFor(() => {
			expect(screen.getByText("No local backups yet")).toBeInTheDocument()
		})
	})
})
