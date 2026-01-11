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

import { invoke } from "@tauri-apps/api/core";
import logger from "@/io/log";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 目录选择结果
 */
export interface DirectorySelectResult {
	readonly path: string | null;
	readonly cancelled: boolean;
}

/**
 * 文件选择过滤器
 */
export interface FileFilter {
	readonly name: string;
	readonly extensions: string[];
}

/**
 * 文件选择选项
 */
export interface FileSelectOptions {
	readonly title?: string;
	readonly defaultPath?: string | null;
	readonly filters?: FileFilter[];
	readonly multiple?: boolean;
}

/**
 * 目录选择选项
 */
export interface DirectorySelectOptions {
	readonly title?: string;
	readonly defaultPath?: string | null;
}

// ============================================================================
// 环境检测
// ============================================================================

/**
 * 检查是否在 Tauri 环境中运行
 */
export function isTauriEnvironment(): boolean {
	return (
		typeof window !== "undefined" &&
		!!(window as unknown as { __TAURI__?: unknown }).__TAURI__
	);
}

// ============================================================================
// 目录选择对话框
// ============================================================================

/**
 * 打开目录选择对话框
 *
 * @param options - 目录选择选项
 * @returns 选择的目录路径，如果用户取消则返回 null
 */
export async function selectDirectory(
	options?: DirectorySelectOptions,
): Promise<string | null> {
	if (!isTauriEnvironment()) {
		logger.warn("[Dialog] selectDirectory: 非 Tauri 环境，返回 null");
		return null;
	}

	try {
		const result = await invoke<string | null>("select_directory", {
			initialDirectory: options?.defaultPath || null,
		});
		return result;
	} catch (error) {
		logger.error("[Dialog] 目录选择失败:", error);
		throw new Error(`目录选择失败: ${error}`);
	}
}

/**
 * 打开目录选择对话框（带详细结果）
 *
 * @param options - 目录选择选项
 * @returns 包含路径和取消状态的结果对象
 */
export async function selectDirectoryWithResult(
	options?: DirectorySelectOptions,
): Promise<DirectorySelectResult> {
	const path = await selectDirectory(options);
	return {
		path,
		cancelled: path === null,
	};
}

// ============================================================================
// 系统目录获取
// ============================================================================

/**
 * 获取系统下载目录
 *
 * @returns 下载目录路径，非 Tauri 环境返回空字符串
 */
export async function getDownloadsDirectory(): Promise<string> {
	if (!isTauriEnvironment()) {
		return "";
	}

	try {
		const result = await invoke<string>("get_downloads_dir");
		return result;
	} catch (error) {
		logger.error("[Dialog] 获取下载目录失败:", error);
		return "";
	}
}

/**
 * 获取系统文档目录
 *
 * @returns 文档目录路径，非 Tauri 环境返回空字符串
 */
export async function getDocumentsDirectory(): Promise<string> {
	if (!isTauriEnvironment()) {
		return "";
	}

	try {
		const result = await invoke<string>("get_documents_dir");
		return result;
	} catch (error) {
		logger.error("[Dialog] 获取文档目录失败:", error);
		return "";
	}
}

/**
 * 获取系统桌面目录
 *
 * @returns 桌面目录路径，非 Tauri 环境返回空字符串
 */
export async function getDesktopDirectory(): Promise<string> {
	if (!isTauriEnvironment()) {
		return "";
	}

	try {
		const result = await invoke<string>("get_desktop_dir");
		return result;
	} catch (error) {
		logger.error("[Dialog] 获取桌面目录失败:", error);
		return "";
	}
}

/**
 * 获取用户主目录
 *
 * @returns 主目录路径，非 Tauri 环境返回空字符串
 */
export async function getHomeDirectory(): Promise<string> {
	if (!isTauriEnvironment()) {
		return "";
	}

	try {
		const result = await invoke<string>("get_home_dir");
		return result;
	} catch (error) {
		logger.error("[Dialog] 获取主目录失败:", error);
		return "";
	}
}
