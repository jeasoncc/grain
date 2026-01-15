/**
 * @file update-checker.view.fn.test.tsx
 * @description 更新检查 View 组件测试
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { UpdateCheckerViewProps } from "./update-checker.types"
import { UpdateCheckerView } from "./update-checker.view.fn"

describe("UpdateCheckerView", () => {
	const defaultProps: UpdateCheckerViewProps = {
		updateInfo: null,
		isChecking: false,
		isDownloading: false,
		downloadProgress: 0,
		showDialog: false,
		checkStatus: "idle",
		errorMessage: "",
		onCheckForUpdates: vi.fn(),
		onDownloadAndInstall: vi.fn(),
		onSetShowDialog: vi.fn(),
	}

	it("should render check for updates button", () => {
		render(<UpdateCheckerView {...defaultProps} />)
		expect(screen.getByRole("button", { name: /check for updates/i })).toBeInTheDocument()
	})

	it("should show checking state when isChecking is true", () => {
		render(<UpdateCheckerView {...defaultProps} isChecking={true} />)
		expect(screen.getByRole("button", { name: /checking/i })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /checking/i })).toBeDisabled()
	})

	it("should call onCheckForUpdates when button clicked", () => {
		const onCheckForUpdates = vi.fn()
		render(<UpdateCheckerView {...defaultProps} onCheckForUpdates={onCheckForUpdates} />)
		fireEvent.click(screen.getByRole("button", { name: /check for updates/i }))
		expect(onCheckForUpdates).toHaveBeenCalled()
	})

	it("should show up-to-date message when checkStatus is up-to-date", () => {
		render(
			<UpdateCheckerView
				{...defaultProps}
				checkStatus="up-to-date"
				updateInfo={{
					available: false,
					currentVersion: "1.0.0",
					latestVersion: "1.0.0",
					body: "",
				}}
			/>,
		)
		expect(screen.getByText(/you're up to date/i)).toBeInTheDocument()
		expect(screen.getByText(/v1.0.0/i)).toBeInTheDocument()
	})

	it("should show dev-mode message when checkStatus is dev-mode", () => {
		render(<UpdateCheckerView {...defaultProps} checkStatus="dev-mode" />)
		expect(screen.getByText(/update check unavailable in browser mode/i)).toBeInTheDocument()
	})

	it("should show error message when checkStatus is error", () => {
		render(<UpdateCheckerView {...defaultProps} checkStatus="error" errorMessage="Network error" />)
		expect(screen.getByText(/check failed/i)).toBeInTheDocument()
		expect(screen.getByText(/network error/i)).toBeInTheDocument()
	})

	it("should show update dialog when showDialog is true", () => {
		render(
			<UpdateCheckerView
				{...defaultProps}
				showDialog={true}
				updateInfo={{
					available: true,
					currentVersion: "1.0.0",
					latestVersion: "1.1.0",
					body: "New features",
				}}
			/>,
		)
		expect(screen.getByText(/update available/i)).toBeInTheDocument()
		expect(screen.getByText(/current version/i)).toBeInTheDocument()
		expect(screen.getByText(/1.0.0/)).toBeInTheDocument()
		expect(screen.getByText(/latest version/i)).toBeInTheDocument()
		expect(screen.getByText(/1.1.0/)).toBeInTheDocument()
	})

	it("should show release notes in dialog", () => {
		render(
			<UpdateCheckerView
				{...defaultProps}
				showDialog={true}
				updateInfo={{
					available: true,
					currentVersion: "1.0.0",
					latestVersion: "1.1.0",
					body: "New features and bug fixes",
				}}
			/>,
		)
		expect(screen.getByText(/release notes/i)).toBeInTheDocument()
		expect(screen.getByText(/new features and bug fixes/i)).toBeInTheDocument()
	})

	it("should show download progress when isDownloading is true", () => {
		render(
			<UpdateCheckerView
				{...defaultProps}
				showDialog={true}
				isDownloading={true}
				downloadProgress={50}
				updateInfo={{
					available: true,
					currentVersion: "1.0.0",
					latestVersion: "1.1.0",
					body: "",
				}}
			/>,
		)
		// Check for the progress percentage instead of "Downloading..." which appears twice
		expect(screen.getByText(/50%/)).toBeInTheDocument()
		expect(screen.getByRole("progressbar")).toBeInTheDocument()
	})

	it("should call onDownloadAndInstall when update button clicked", () => {
		const onDownloadAndInstall = vi.fn()
		render(
			<UpdateCheckerView
				{...defaultProps}
				showDialog={true}
				onDownloadAndInstall={onDownloadAndInstall}
				updateInfo={{
					available: true,
					currentVersion: "1.0.0",
					latestVersion: "1.1.0",
					body: "",
				}}
			/>,
		)
		fireEvent.click(screen.getByRole("button", { name: /update now/i }))
		expect(onDownloadAndInstall).toHaveBeenCalled()
	})

	it("should call onSetShowDialog when later button clicked", () => {
		const onSetShowDialog = vi.fn()
		render(
			<UpdateCheckerView
				{...defaultProps}
				showDialog={true}
				onSetShowDialog={onSetShowDialog}
				updateInfo={{
					available: true,
					currentVersion: "1.0.0",
					latestVersion: "1.1.0",
					body: "",
				}}
			/>,
		)
		fireEvent.click(screen.getByRole("button", { name: /later/i }))
		expect(onSetShowDialog).toHaveBeenCalledWith(false)
	})

	it("should disable buttons when isDownloading is true", () => {
		render(
			<UpdateCheckerView
				{...defaultProps}
				showDialog={true}
				isDownloading={true}
				updateInfo={{
					available: true,
					currentVersion: "1.0.0",
					latestVersion: "1.1.0",
					body: "",
				}}
			/>,
		)
		expect(screen.getByRole("button", { name: /downloading/i })).toBeDisabled()
		expect(screen.getByRole("button", { name: /later/i })).toBeDisabled()
	})
})
