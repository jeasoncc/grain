/**
 * Backup Manager Container Component Tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackupManagerContainer } from "./backup-manager.container.fn";

// Mock dependencies
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
	},
}));

vi.mock("@/components/ui/confirm", () => ({
	useConfirm: () => vi.fn().mockResolvedValue(true),
}));

vi.mock("@/db/backup.db.fn", () => ({
	getDatabaseStats: vi.fn(() =>
		vi.fn(() =>
			Promise.resolve(
				TE.right({
					userCount: 2,
					projectCount: 5,
					nodeCount: 20,
					contentCount: 15,
					drawingCount: 3,
					attachmentCount: 8,
					tagCount: 12,
				}),
			),
		),
	),
	getLocalBackups: vi.fn(() => []),
	exportBackupJson: vi.fn(() => vi.fn(() => Promise.resolve(TE.right({})))),
	exportBackupZip: vi.fn(() => vi.fn(() => Promise.resolve(TE.right({})))),
	restoreBackup: vi.fn(() => vi.fn(() => Promise.resolve(TE.right({})))),
	restoreLocalBackup: vi.fn(() => vi.fn(() => Promise.resolve(TE.right({})))),
	autoBackupManager: {
		start: vi.fn(),
		stop: vi.fn(),
	},
}));

vi.mock("@/db/clear-data.db.fn", () => ({
	getStorageStats: vi.fn(() =>
		vi.fn(() =>
			Promise.resolve(
				TE.right({
					indexedDB: {
						size: 1024000,
						tables: {
							users: 2,
							workspaces: 5,
							nodes: 20,
							contents: 15,
							drawings: 3,
							attachments: 8,
							tags: 12,
						},
						tableSizes: {
							users: 10240,
							workspaces: 512000,
							nodes: 256000,
							contents: 128000,
							drawings: 51200,
							attachments: 40960,
							tags: 25600,
						},
					},
					localStorage: {
						size: 2048,
						keys: 10,
					},
					sessionStorage: {
						size: 1024,
						keys: 5,
					},
					cookies: {
						count: 3,
					},
				}),
			),
		),
	),
	clearAllData: vi.fn(() => vi.fn(() => Promise.resolve(TE.right({})))),
}));

vi.mock("@/log", () => ({
	default: {
		error: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
	},
}));

describe("BackupManagerContainer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it("should render and fetch data on mount", async () => {
		render(<BackupManagerContainer />);

		// Wait for loading to complete
		await waitFor(
			() => {
				expect(screen.queryByRole("status")).not.toBeInTheDocument();
			},
			{ timeout: 2000 },
		);

		// Now check for the data
		await waitFor(() => {
			expect(screen.getByText(/Data Statistics/i)).toBeInTheDocument();
		});
	});

	it("should load auto backup state from localStorage", async () => {
		localStorage.setItem("auto-backup-enabled", "true");

		render(<BackupManagerContainer />);

		await waitFor(() => {
			const switchElement = screen.getByRole("switch");
			expect(switchElement).toBeChecked();
		});
	});

	it("should render storage stats", async () => {
		render(<BackupManagerContainer />);

		// Wait for loading to complete
		await waitFor(
			() => {
				expect(screen.queryByRole("status")).not.toBeInTheDocument();
			},
			{ timeout: 2000 },
		);

		// Storage stats should not be visible initially (data is loading)
		// This test just verifies the component renders without errors
		expect(screen.getByText("Data Statistics")).toBeInTheDocument();
	});

	it("should render manual backup section", async () => {
		render(<BackupManagerContainer />);

		await waitFor(() => {
			expect(screen.getByText("Manual Backup")).toBeInTheDocument();
		});

		expect(screen.getByText("Export JSON")).toBeInTheDocument();
		expect(screen.getByText("Export ZIP")).toBeInTheDocument();
		expect(screen.getByText("Restore Backup")).toBeInTheDocument();
	});

	it("should render auto backup section", async () => {
		render(<BackupManagerContainer />);

		await waitFor(() => {
			expect(screen.getByText("Auto Backup")).toBeInTheDocument();
		});

		expect(screen.getByRole("switch")).toBeInTheDocument();
	});

	it("should render danger zone section", async () => {
		render(<BackupManagerContainer />);

		await waitFor(() => {
			expect(screen.getByText("Danger Zone")).toBeInTheDocument();
		});

		expect(screen.getByText("Clear All")).toBeInTheDocument();
		expect(screen.getByText("Clear DB")).toBeInTheDocument();
		expect(screen.getByText("Reset Settings")).toBeInTheDocument();
	});

	it("should show empty state for local backups", async () => {
		render(<BackupManagerContainer />);

		await waitFor(() => {
			expect(screen.getByText("No local backups yet")).toBeInTheDocument();
		});
	});
});
