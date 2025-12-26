/**
 * Backup Manager View Component Tests
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BackupManagerView } from "./backup-manager.view.fn";
import type { BackupManagerViewProps } from "./backup-manager.types";

describe("BackupManagerView", () => {
	const mockStats = {
		userCount: 2,
		projectCount: 5,
		nodeCount: 20,
		contentCount: 15,
		drawingCount: 3,
		attachmentCount: 8,
		tagCount: 12,
	};

	const mockStorageStats = {
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
	};

	const defaultProps: BackupManagerViewProps = {
		stats: mockStats,
		storageStats: mockStorageStats,
		loading: false,
		autoBackupEnabled: false,
		localBackups: [],
		onExportJson: vi.fn(),
		onExportZip: vi.fn(),
		onRestore: vi.fn(),
		onToggleAutoBackup: vi.fn(),
		onRestoreLocal: vi.fn(),
		onClearAllData: vi.fn(),
		onClearDatabase: vi.fn(),
		onClearSettings: vi.fn(),
	};

	it("should render with stats", () => {
		render(<BackupManagerView {...defaultProps} />);
		expect(screen.getByText("Data Statistics")).toBeInTheDocument();
		expect(screen.getByText("5")).toBeInTheDocument(); // projectCount
		expect(screen.getByText("20")).toBeInTheDocument(); // nodeCount
	});

	it("should show loading state when stats is null", () => {
		const { container } = render(
			<BackupManagerView {...defaultProps} stats={null} />,
		);
		// The loading div with spinner should be visible
		const loadingDiv = container.querySelector(".animate-spin");
		expect(loadingDiv).toBeInTheDocument();
	});

	it("should call onExportJson when Export JSON button clicked", () => {
		const onExportJson = vi.fn();
		render(<BackupManagerView {...defaultProps} onExportJson={onExportJson} />);
		fireEvent.click(screen.getByText("Export JSON"));
		expect(onExportJson).toHaveBeenCalled();
	});

	it("should call onExportZip when Export ZIP button clicked", () => {
		const onExportZip = vi.fn();
		render(<BackupManagerView {...defaultProps} onExportZip={onExportZip} />);
		fireEvent.click(screen.getByText("Export ZIP"));
		expect(onExportZip).toHaveBeenCalled();
	});

	it("should call onRestore when Restore Backup button clicked", () => {
		const onRestore = vi.fn();
		render(<BackupManagerView {...defaultProps} onRestore={onRestore} />);
		fireEvent.click(screen.getByText("Restore Backup"));
		expect(onRestore).toHaveBeenCalled();
	});

	it("should disable buttons when loading", () => {
		render(<BackupManagerView {...defaultProps} loading={true} />);
		expect(screen.getByText("Export JSON")).toBeDisabled();
		expect(screen.getByText("Export ZIP")).toBeDisabled();
		expect(screen.getByText("Restore Backup")).toBeDisabled();
	});

	it("should call onToggleAutoBackup when switch toggled", () => {
		const onToggleAutoBackup = vi.fn();
		render(
			<BackupManagerView
				{...defaultProps}
				onToggleAutoBackup={onToggleAutoBackup}
			/>,
		);
		const switchElement = screen.getByRole("switch");
		fireEvent.click(switchElement);
		expect(onToggleAutoBackup).toHaveBeenCalledWith(true);
	});

	it("should show local backups when available", () => {
		const localBackups = [
			{
				timestamp: "2024-01-01T00:00:00.000Z",
				data: {
					metadata: {
						version: "1.0.0",
						timestamp: "2024-01-01T00:00:00.000Z",
						projectCount: 5,
						nodeCount: 20,
						contentCount: 15,
						tagCount: 12,
						appVersion: "1.0.0",
					},
					users: [],
					workspaces: [],
					nodes: [],
					contents: [],
					drawings: [],
					attachments: [],
					tags: [],
					dbVersions: [],
				},
			},
		];
		render(<BackupManagerView {...defaultProps} localBackups={localBackups} />);
		expect(screen.getByText("Local Backup History")).toBeInTheDocument();
		expect(screen.getByText(/5 projects/)).toBeInTheDocument();
	});

	it("should show empty state when no local backups", () => {
		render(<BackupManagerView {...defaultProps} localBackups={[]} />);
		expect(screen.getByText("No local backups yet")).toBeInTheDocument();
	});

	it("should call onRestoreLocal when restore button clicked", () => {
		const onRestoreLocal = vi.fn();
		const localBackups = [
			{
				timestamp: "2024-01-01T00:00:00.000Z",
				data: {
					metadata: {
						version: "1.0.0",
						timestamp: "2024-01-01T00:00:00.000Z",
						projectCount: 5,
						nodeCount: 20,
						contentCount: 15,
						tagCount: 12,
						appVersion: "1.0.0",
					},
					users: [],
					workspaces: [],
					nodes: [],
					contents: [],
					drawings: [],
					attachments: [],
					tags: [],
					dbVersions: [],
				},
			},
		];
		render(
			<BackupManagerView
				{...defaultProps}
				localBackups={localBackups}
				onRestoreLocal={onRestoreLocal}
			/>,
		);
		fireEvent.click(screen.getByText("Restore"));
		expect(onRestoreLocal).toHaveBeenCalledWith("2024-01-01T00:00:00.000Z");
	});

	it("should call onClearAllData when Clear All button clicked", () => {
		const onClearAllData = vi.fn();
		render(
			<BackupManagerView
				{...defaultProps}
				onClearAllData={onClearAllData}
			/>,
		);
		fireEvent.click(screen.getByText("Clear All"));
		expect(onClearAllData).toHaveBeenCalled();
	});

	it("should call onClearDatabase when Clear DB button clicked", () => {
		const onClearDatabase = vi.fn();
		render(
			<BackupManagerView
				{...defaultProps}
				onClearDatabase={onClearDatabase}
			/>,
		);
		fireEvent.click(screen.getByText("Clear DB"));
		expect(onClearDatabase).toHaveBeenCalled();
	});

	it("should call onClearSettings when Reset Settings button clicked", () => {
		const onClearSettings = vi.fn();
		render(
			<BackupManagerView
				{...defaultProps}
				onClearSettings={onClearSettings}
			/>,
		);
		fireEvent.click(screen.getByText("Reset Settings"));
		expect(onClearSettings).toHaveBeenCalled();
	});

	it("should render storage stats when available", () => {
		render(<BackupManagerView {...defaultProps} />);
		expect(screen.getByText("Storage Usage")).toBeInTheDocument();
		expect(screen.getByText("IndexedDB")).toBeInTheDocument();
		expect(screen.getByText("localStorage")).toBeInTheDocument();
		expect(screen.getByText("sessionStorage")).toBeInTheDocument();
		expect(screen.getByText("Cookies")).toBeInTheDocument();
	});

	it("should not render storage stats when null", () => {
		render(<BackupManagerView {...defaultProps} storageStats={null} />);
		expect(screen.queryByText("Storage Usage")).not.toBeInTheDocument();
	});
});
