/**
 * @file io/file/dialog.file.ts
 * @description 文件对话框 IO 操作
 *
 * 提供文件/目录选择对话框功能。
 * 支持 Tauri 桌面环境和浏览器环境的降级处理。
 *
 * 职责：与文件系统对话框交互（IO 边界）
 * 依赖：types/
 */

import { invoke } from "@tauri-apps/api/core"
import * as TE from "fp-ts/TaskEither"
import { error as logError, warn } from "@/io/log/logger.api"

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 目录选择结果
 */
export interface DirectorySelectResult {
	readonly path: string | null
	readonly cancelled: boolean
}

/**
 * 文件选择过滤器
 */
export interface FileFilter {
	readonly name: string
	readonly extensions: readonly string[]
}

/**
 * 文件选择选项
 */
export interface FileSelectOptions {
	readonly title?: string
	readonly defaultPath?: string | null
	readonly filters?: ReadonlyArray<FileFilter>
	readonly multiple?: boolean
}

/**
 * 目录选择选项
 */
export interface DirectorySelectOptions {
	readonly title?: string
	readonly defaultPath?: string | null
}

// ============================================================================
// 环境检测
// ============================================================================

/**
 * 检查是否在 Tauri 环境中运行
 */
export function isTauriEnvironment(): boolean {
	return typeof window !== "undefined" && !!(window as unknown as { __TAURI__?: unknown }).__TAURI__
}

// ============================================================================
// 目录选择对话框
// ============================================================================

/**
 * 打开目录选择对话框
 *
 * @param options - 目录选择选项
 * @returns TaskEither<Error, string | null>
 */
export function selectDirectory(
	options?: DirectorySelectOptions,
): TE.TaskEither<Error, string | null> {
	if (!isTauriEnvironment()) {
		warn("[Dialog] selectDirectory: 非 Tauri 环境，返回 null")
		return TE.right(null)
	}

	return TE.tryCatch(
		async () => {
			const result = await invoke<string | null>("select_directory", {
				initialDirectory: options?.defaultPath || null,
			})
			return result
		},
		(err) => {
			logError("[Dialog] 目录选择失败", { error: err }, "dialog.file")
			return new Error(`目录选择失败: ${String(err)}`)
		},
	)
}

/**
 * 打开目录选择对话框（带详细结果）
 *
 * @param options - 目录选择选项
 * @returns TaskEither<Error, DirectorySelectResult>
 */
export function selectDirectoryWithResult(
	options?: DirectorySelectOptions,
): TE.TaskEither<Error, DirectorySelectResult> {
	return TE.map((path: string | null) => ({
		cancelled: path === null,
		path,
	}))(selectDirectory(options))
}

// ============================================================================
// 系统目录获取
// ============================================================================

/**
 * 获取系统下载目录
 *
 * @returns TaskEither<Error, string>
 */
export function getDownloadsDirectory(): TE.TaskEither<Error, string> {
	if (!isTauriEnvironment()) {
		return TE.right("")
	}

	return TE.tryCatch(
		async () => {
			const result = await invoke<string>("get_downloads_dir")
			return result
		},
		(err) => {
			logError("[Dialog] 获取下载目录失败", { error: err }, "dialog.file")
			return new Error(`获取下载目录失败: ${String(err)}`)
		},
	)
}

/**
 * 获取系统文档目录
 *
 * @returns TaskEither<Error, string>
 */
export function getDocumentsDirectory(): TE.TaskEither<Error, string> {
	if (!isTauriEnvironment()) {
		return TE.right("")
	}

	return TE.tryCatch(
		async () => {
			const result = await invoke<string>("get_documents_dir")
			return result
		},
		(err) => {
			logError("[Dialog] 获取文档目录失败", { error: err }, "dialog.file")
			return new Error(`获取文档目录失败: ${String(err)}`)
		},
	)
}

/**
 * 获取系统桌面目录
 *
 * @returns TaskEither<Error, string>
 */
export function getDesktopDirectory(): TE.TaskEither<Error, string> {
	if (!isTauriEnvironment()) {
		return TE.right("")
	}

	return TE.tryCatch(
		async () => {
			const result = await invoke<string>("get_desktop_dir")
			return result
		},
		(err) => {
			logError("[Dialog] 获取桌面目录失败", { error: err }, "dialog.file")
			return new Error(`获取桌面目录失败: ${String(err)}`)
		},
	)
}

/**
 * 获取用户主目录
 *
 * @returns TaskEither<Error, string>
 */
export function getHomeDirectory(): TE.TaskEither<Error, string> {
	if (!isTauriEnvironment()) {
		return TE.right("")
	}

	return TE.tryCatch(
		async () => {
			const result = await invoke<string>("get_home_dir")
			return result
		},
		(err) => {
			logError("[Dialog] 获取主目录失败", { error: err }, "dialog.file")
			return new Error(`获取主目录失败: ${String(err)}`)
		},
	)
}

// ============================================================================
// 文件选择对话框（浏览器环境）
// ============================================================================

/**
 * 文件选择结果
 */
export interface FileSelectResult {
	readonly file: File | null
	readonly cancelled: boolean
}

/**
 * 打开文件选择对话框（浏览器环境）
 *
 * @param options - 文件选择选项
 * @returns Promise<FileSelectResult>
 */
export async function selectFile(options?: FileSelectOptions): Promise<FileSelectResult> {
	return new Promise((resolve) => {
		const input = document.createElement("input")

		// Apply configuration functionally using Object.assign
		Object.assign(input, {
			multiple: options?.multiple ?? false,
			type: "file",
		})

		if (options?.filters && options.filters.length > 0) {
			const extensions = options.filters.flatMap((f) => f.extensions)
			const acceptValue = extensions.map((ext) => `.${ext}`).join(",")
			Object.assign(input, { accept: acceptValue })
		}

		const handleChange = (e: Event) => {
			const file = (e.target as HTMLInputElement).files?.[0]
			resolve({
				cancelled: !file,
				file: file ?? null,
			})
		}

		const handleCancel = () => {
			resolve({
				cancelled: true,
				file: null,
			})
		}

		// Assign event handlers using addEventListener instead of direct assignment
		input.addEventListener("change", handleChange)
		input.addEventListener("cancel", handleCancel)

		input.click()
	})
}
