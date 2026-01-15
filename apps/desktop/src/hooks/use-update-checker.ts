/**
 * @file use-update-checker.ts
 * @description 更新检查 Hook
 *
 * 功能说明：
 * - 封装更新检查的复杂状态逻辑
 * - 提供纯净的状态和操作函数
 * - 符合函数式架构规范
 */

import * as E from "fp-ts/Either"
import { useCallback, useEffect, useState } from "react"
import { checkForUpdates, downloadAndInstallUpdate, type UpdateInfo } from "@/flows/updater"

type CheckStatus = "idle" | "checking" | "up-to-date" | "update-available" | "error" | "dev-mode"

interface UseUpdateCheckerReturn {
	readonly updateInfo: UpdateInfo | null
	readonly isChecking: boolean
	readonly isDownloading: boolean
	readonly downloadProgress: number
	readonly showDialog: boolean
	readonly checkStatus: CheckStatus
	readonly errorMessage: string
	readonly handleCheckForUpdates: () => Promise<void>
	readonly handleDownloadAndInstall: () => Promise<void>
	readonly setShowDialog: (show: boolean) => void
}

/**
 * 更新检查 Hook
 *
 * 封装更新检查的所有状态和逻辑，提供纯净的接口。
 *
 * @returns 更新检查的状态和操作函数
 */
export function useUpdateChecker(): UseUpdateCheckerReturn {
	const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
	const [isChecking, setIsChecking] = useState(false)
	const [isDownloading, setIsDownloading] = useState(false)
	const [downloadProgress, setDownloadProgress] = useState(0)
	const [showDialog, setShowDialog] = useState(false)
	const [checkStatus, setCheckStatus] = useState<CheckStatus>("idle")
	const [errorMessage, setErrorMessage] = useState<string>("")

	const handleCheckForUpdates = useCallback(async () => {
		setIsChecking(true)
		setCheckStatus("checking")
		setErrorMessage("")

		try {
			const result = await checkForUpdates()()
			if (E.isLeft(result)) {
				throw new Error(result.left.message)
			}

			const info = result.right
			setUpdateInfo(info)

			if (info.available) {
				setCheckStatus("update-available")
				setShowDialog(true)
			} else if (info.currentVersion === "dev") {
				// Running in browser, not Tauri
				setCheckStatus("dev-mode")
			} else {
				setCheckStatus("up-to-date")
			}
		} catch (error) {
			error("[UpdateChecker] 检查更新失败", { error }, "use-update-checker")
			setCheckStatus("error")
			setErrorMessage(error instanceof Error ? error.message : "Unknown error")
		} finally {
			setIsChecking(false)
		}
	}, [])

	const handleDownloadAndInstall = useCallback(async () => {
		setIsDownloading(true)
		setDownloadProgress(0)

		try {
			const result = await downloadAndInstallUpdate((progress) => {
				setDownloadProgress(progress.percentage)
			})()

			if (E.isLeft(result)) {
				throw new Error(result.left.message)
			}
		} catch (error) {
			error("[UpdateChecker] 下载安装更新失败", { error }, "use-update-checker")
			setIsDownloading(false)
		}
	}, [])

	// Check for updates on mount
	useEffect(() => {
		handleCheckForUpdates()
	}, [handleCheckForUpdates])

	// Auto-clear status message after 5 seconds
	useEffect(() => {
		if (checkStatus === "up-to-date" || checkStatus === "dev-mode" || checkStatus === "error") {
			const timer = setTimeout(() => {
				setCheckStatus("idle")
			}, 5000)
			return () => clearTimeout(timer)
		}
	}, [checkStatus])

	return {
		updateInfo,
		isChecking,
		isDownloading,
		downloadProgress,
		showDialog,
		checkStatus,
		errorMessage,
		handleCheckForUpdates,
		handleDownloadAndInstall,
		setShowDialog,
	}
}
