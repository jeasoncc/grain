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
			checkStatus: "idle",
			downloadProgress: 0,
			errorMessage: "",
			handleCheckForUpdates: vi.fn(),
			handleDownloadAndInstall: vi.fn(),
			isChecking: false,
			isDownloading: false,
			setShowDialog: vi.fn(),
			showDialog: false,
			updateInfo: null,
		})

		render(<UpdateCheckerContainer />)
		expect(screen.getByRole("button", { name: /check for updates/i })).toBeInTheDocument()
	})

	it("should pass checking state to view", async () => {
		const { useUpdateChecker } = await import("@/hooks/use-update-checker")
		vi.mocked(useUpdateChecker).mockReturnValue({
			checkStatus: "checking",
			downloadProgress: 0,
			errorMessage: "",
			handleCheckForUpdates: vi.fn(),
			handleDownloadAndInstall: vi.fn(),
			isChecking: true,
			isDownloading: false,
			setShowDialog: vi.fn(),
			showDialog: false,
			updateInfo: null,
		})

		render(<UpdateCheckerContainer />)
		expect(screen.getByRole("button", { name: /checking/i })).toBeInTheDocument()
	})

	it("should pass up-to-date status to view", async () => {
		const { useUpdateChecker } = await import("@/hooks/use-update-checker")
		vi.mocked(useUpdateChecker).mockReturnValue({
			checkStatus: "up-to-date",
			downloadProgress: 0,
			errorMessage: "",
			handleCheckForUpdates: vi.fn(),
			handleDownloadAndInstall: vi.fn(),
			isChecking: false,
			isDownloading: false,
			setShowDialog: vi.fn(),
			showDialog: false,
			updateInfo: {
				available: false,
				body: "",
				currentVersion: "1.0.0",
				latestVersion: "1.0.0",
			},
		})

		render(<UpdateCheckerContainer />)
		expect(screen.getByText(/you're up to date/i)).toBeInTheDocument()
	})

	it("should pass error state to view", async () => {
		const { useUpdateChecker } = await import("@/hooks/use-update-checker")
		vi.mocked(useUpdateChecker).mockReturnValue({
			checkStatus: "error",
			downloadProgress: 0,
			errorMessage: "Network error",
			handleCheckForUpdates: vi.fn(),
			handleDownloadAndInstall: vi.fn(),
			isChecking: false,
			isDownloading: false,
			setShowDialog: vi.fn(),
			showDialog: false,
			updateInfo: null,
		})

		render(<UpdateCheckerContainer />)
		expect(screen.getByText(/check failed/i)).toBeInTheDocument()
		expect(screen.getByText(/network error/i)).toBeInTheDocument()
	})

	it("should pass update available state to view", async () => {
		const { useUpdateChecker } = await import("@/hooks/use-update-checker")
		vi.mocked(useUpdateChecker).mockReturnValue({
			checkStatus: "update-available",
			downloadProgress: 0,
			errorMessage: "",
			handleCheckForUpdates: vi.fn(),
			handleDownloadAndInstall: vi.fn(),
			isChecking: false,
			isDownloading: false,
			setShowDialog: vi.fn(),
			showDialog: true,
			updateInfo: {
				available: true,
				body: "New features",
				currentVersion: "1.0.0",
				latestVersion: "1.1.0",
			},
		})

		render(<UpdateCheckerContainer />)
		expect(screen.getByText(/update available/i)).toBeInTheDocument()
		expect(screen.getByText(/1.0.0/)).toBeInTheDocument()
		expect(screen.getByText(/1.1.0/)).toBeInTheDocument()
	})

	it("should pass download progress to view", async () => {
		const { useUpdateChecker } = await import("@/hooks/use-update-checker")
		vi.mocked(useUpdateChecker).mockReturnValue({
			checkStatus: "update-available",
			downloadProgress: 75,
			errorMessage: "",
			handleCheckForUpdates: vi.fn(),
			handleDownloadAndInstall: vi.fn(),
			isChecking: false,
			isDownloading: true,
			setShowDialog: vi.fn(),
			showDialog: true,
			updateInfo: {
				available: true,
				body: "",
				currentVersion: "1.0.0",
				latestVersion: "1.1.0",
			},
		})

		render(<UpdateCheckerContainer />)
		// Check for the progress percentage instead of "Downloading..." which appears twice
		expect(screen.getByText(/75%/)).toBeInTheDocument()
		expect(screen.getByRole("progressbar")).toBeInTheDocument()
	})
})
