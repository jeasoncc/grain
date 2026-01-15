/**
 * @file update-checker.container.fn.test.tsx
 * @description 更新检查 Container 组件测试
 */

import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { UpdateCheckerContainer } from "./update-checker.container.fn"

// Mock the hook
vi.mock("@/hooks/use-update-checker", () => ({
	useUpdateChecker: vi.fn(),
}))

describe("UpdateCheckerContainer", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should fetch data from hook and pass to view", async () => {
		const { useUpdateChecker } = await import("@/hooks/use-update-checker")
		vi.mocked(useUpdateChecker).mockReturnValue({
			updateInfo: null,
			isChecking: false,
			isDownloading: false,
			downloadProgress: 0,
			showDialog: false,
			checkStatus: "idle",
			errorMessage: "",
			handleCheckForUpdates: vi.fn(),
			handleDownloadAndInstall: vi.fn(),
			setShowDialog: vi.fn(),
		})

		render(<UpdateCheckerContainer />)
		expect(screen.getByRole("button", { name: /check for updates/i })).toBeInTheDocument()
	})

	it("should pass checking state to view", async () => {
		const { useUpdateChecker } = await import("@/hooks/use-update-checker")
		vi.mocked(useUpdateChecker).mockReturnValue({
			updateInfo: null,
			isChecking: true,
			isDownloading: false,
			downloadProgress: 0,
			showDialog: false,
			checkStatus: "checking",
			errorMessage: "",
			handleCheckForUpdates: vi.fn(),
			handleDownloadAndInstall: vi.fn(),
			setShowDialog: vi.fn(),
		})

		render(<UpdateCheckerContainer />)
		expect(screen.getByRole("button", { name: /checking/i })).toBeInTheDocument()
	})

	it("should pass up-to-date status to view", async () => {
		const { useUpdateChecker } = await import("@/hooks/use-update-checker")
		vi.mocked(useUpdateChecker).mockReturnValue({
			updateInfo: {
				available: false,
				currentVersion: "1.0.0",
				latestVersion: "1.0.0",
				body: "",
			},
			isChecking: false,
			isDownloading: false,
			downloadProgress: 0,
			showDialog: false,
			checkStatus: "up-to-date",
			errorMessage: "",
			handleCheckForUpdates: vi.fn(),
			handleDownloadAndInstall: vi.fn(),
			setShowDialog: vi.fn(),
		})

		render(<UpdateCheckerContainer />)
		expect(screen.getByText(/you're up to date/i)).toBeInTheDocument()
	})

	it("should pass error state to view", async () => {
		const { useUpdateChecker } = await import("@/hooks/use-update-checker")
		vi.mocked(useUpdateChecker).mockReturnValue({
			updateInfo: null,
			isChecking: false,
			isDownloading: false,
			downloadProgress: 0,
			showDialog: false,
			checkStatus: "error",
			errorMessage: "Network error",
			handleCheckForUpdates: vi.fn(),
			handleDownloadAndInstall: vi.fn(),
			setShowDialog: vi.fn(),
		})

		render(<UpdateCheckerContainer />)
		expect(screen.getByText(/check failed/i)).toBeInTheDocument()
		expect(screen.getByText(/network error/i)).toBeInTheDocument()
	})

	it("should pass update available state to view", async () => {
		const { useUpdateChecker } = await import("@/hooks/use-update-checker")
		vi.mocked(useUpdateChecker).mockReturnValue({
			updateInfo: {
				available: true,
				currentVersion: "1.0.0",
				latestVersion: "1.1.0",
				body: "New features",
			},
			isChecking: false,
			isDownloading: false,
			downloadProgress: 0,
			showDialog: true,
			checkStatus: "update-available",
			errorMessage: "",
			handleCheckForUpdates: vi.fn(),
			handleDownloadAndInstall: vi.fn(),
			setShowDialog: vi.fn(),
		})

		render(<UpdateCheckerContainer />)
		expect(screen.getByText(/update available/i)).toBeInTheDocument()
		expect(screen.getByText(/1.0.0/)).toBeInTheDocument()
		expect(screen.getByText(/1.1.0/)).toBeInTheDocument()
	})

	it("should pass download progress to view", async () => {
		const { useUpdateChecker } = await import("@/hooks/use-update-checker")
		vi.mocked(useUpdateChecker).mockReturnValue({
			updateInfo: {
				available: true,
				currentVersion: "1.0.0",
				latestVersion: "1.1.0",
				body: "",
			},
			isChecking: false,
			isDownloading: true,
			downloadProgress: 75,
			showDialog: true,
			checkStatus: "update-available",
			errorMessage: "",
			handleCheckForUpdates: vi.fn(),
			handleDownloadAndInstall: vi.fn(),
			setShowDialog: vi.fn(),
		})

		render(<UpdateCheckerContainer />)
		// Check for the progress percentage instead of "Downloading..." which appears twice
		expect(screen.getByText(/75%/)).toBeInTheDocument()
		expect(screen.getByRole("progressbar")).toBeInTheDocument()
	})
})
