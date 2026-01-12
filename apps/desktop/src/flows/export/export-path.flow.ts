/**
 * @file flows/export/export-path.flow.ts
 * @description Export 路径管理 Flow
 *
 * 提供导出路径选择、文件保存、设置管理等功能。
 * 支持 Tauri 桌面环境和浏览器环境的降级处理。
 *
 * Requirements: 4.1, 4.2, 4.3
 */

import { invoke } from "@tauri-apps/api/core";
import { saveAs } from "file-saver";
import { z } from "zod";
import { warn, success } from "@/io/log/logger.api";

// ============================================================================
// Zod Schema 定义
// ============================================================================

/**
 * Export 设置 Schema
 */
export const exportSettingsSchema = z.object({
	defaultExportPath: z.string().nullable(),
	lastUsedPath: z.string().nullable(),
});

// ============================================================================
// 类型定义
// ============================================================================

/**
 * Export 设置接口（从 Zod Schema 推断）
 */
export type ExportSettings = z.infer<typeof exportSettingsSchema>;

/**
 * Export 路径服务接口
 */
export interface ExportPathService {
	selectExportDirectory(): Promise<string | null>;
	saveToPath(path: string, filename: string, content: Blob): Promise<void>;
	getDefaultExportPath(): string | null;
	setDefaultExportPath(path: string | null): void;
	isTauriEnvironment(): boolean;
}

/**
 * Export 结果接口
 */
export interface ExportResult {
	readonly success: boolean;
	readonly path?: string;
	readonly cancelled?: boolean;
	readonly error?: string;
}

/**
 * Export 选项接口
 */
export interface ExportWithPathOptions {
	readonly useDefaultPath?: boolean;
	readonly showSuccessMessage?: boolean;
}

// ============================================================================
// 常量
// ============================================================================

const EXPORT_SETTINGS_KEY = "grain-export-settings";

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
// 目录选择
// ============================================================================

/**
 * 选择 Export 目录
 *
 * @param initialDirectory - 可选的初始目录路径，对话框将从此目录打开
 * @returns 选择的目录路径，如果用户取消则返回 null
 */
export async function selectExportDirectory(
	initialDirectory?: string | null,
): Promise<string | null> {
	if (!isTauriEnvironment()) {
		warn("[Export] selectExportDirectory: 非 Tauri 环境，返回 null");
		return null;
	}

	try {
		const result = await invoke<string | null>("select_directory", {
			initialDirectory: initialDirectory || null,
		});
		return result;
	} catch (error) {
		error("[Export] 目录选择失败", { error }, "export-path.flow");
		throw new Error(`目录选择失败: ${error}`);
	}
}

// ============================================================================
// 文件保存
// ============================================================================

/**
 * 将文件保存到指定路径
 *
 * @param path - 目标目录路径
 * @param filename - 文件名
 * @param content - 文件内容 (Blob 或 Uint8Array)
 */
export async function saveToPath(
	path: string,
	filename: string,
	content: Blob | Uint8Array,
): Promise<void> {
	if (!isTauriEnvironment()) {
		// 浏览器环境降级处理：使用 file-saver 下载
		warn("[Export] saveToPath: 非 Tauri 环境，降级为浏览器下载");
		if (content instanceof Uint8Array) {
			// 创建新的 ArrayBuffer 避免 SharedArrayBuffer 类型问题
			const buffer = new ArrayBuffer(content.length);
			new Uint8Array(buffer).set(content);
			const blob = new Blob([buffer]);
			saveAs(blob, filename);
		} else {
			saveAs(content, filename);
		}
		return;
	}

	try {
		// 将 Blob 转换为 Uint8Array
		let contentArray: number[];
		if (content instanceof Blob) {
			const arrayBuffer = await content.arrayBuffer();
			contentArray = Array.from(new Uint8Array(arrayBuffer));
		} else {
			contentArray = Array.from(content);
		}

		await invoke("save_file", {
			path,
			filename,
			content: contentArray,
		});
		success("[Export] 文件保存成功", { path: `${path}/${filename}` }, "export-path");
	} catch (error) {
		error("[Export] 文件保存失败", { error }, "export-path.flow");
		throw new Error(`文件保存失败: ${error}`);
	}
}

// ============================================================================
// 系统目录
// ============================================================================

/**
 * 获取系统下载目录
 *
 * @returns 下载目录路径
 */
export async function getDownloadsDirectory(): Promise<string> {
	if (!isTauriEnvironment()) {
		// 浏览器环境返回空字符串
		return "";
	}

	try {
		const result = await invoke<string>("get_downloads_dir");
		return result;
	} catch (error) {
		error("[Export] 获取下载目录失败", { error }, "export-path.flow");
		return "";
	}
}

// ============================================================================
// 设置管理
// ============================================================================

/**
 * 默认 Export 设置
 */
const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
	defaultExportPath: null,
	lastUsedPath: null,
};

/**
 * 获取 Export 设置
 *
 * 使用 Zod Schema 校验 localStorage 数据，确保类型安全
 */
export function getExportSettings(): ExportSettings {
	try {
		const stored = localStorage.getItem(EXPORT_SETTINGS_KEY);
		if (!stored) {
			return DEFAULT_EXPORT_SETTINGS;
		}

		const parsed = JSON.parse(stored);
		const result = exportSettingsSchema.safeParse(parsed);

		if (result.success) {
			return result.data;
		}

		warn("[Export] 设置数据格式无效，使用默认值", { error: result.error }, "export-path.flow");
		return DEFAULT_EXPORT_SETTINGS;
	} catch (error) {
		error("[Export] 加载设置失败", { error }, "export-path.flow");
		return DEFAULT_EXPORT_SETTINGS;
	}
}

/**
 * 保存 Export 设置
 */
export function saveExportSettings(settings: ExportSettings): void {
	try {
		localStorage.setItem(EXPORT_SETTINGS_KEY, JSON.stringify(settings));
	} catch (error) {
		error("[Export] 保存设置失败", { error }, "export-path.flow");
	}
}

/**
 * 获取默认 Export 路径
 */
export function getDefaultExportPath(): string | null {
	return getExportSettings().defaultExportPath;
}

/**
 * 设置默认 Export 路径
 */
export function setDefaultExportPath(path: string | null): void {
	const settings = getExportSettings();
	saveExportSettings({
		...settings,
		defaultExportPath: path,
	});
}

/**
 * 获取最后使用的路径
 */
export function getLastUsedPath(): string | null {
	return getExportSettings().lastUsedPath;
}

/**
 * 设置最后使用的路径
 */
export function setLastUsedPath(path: string | null): void {
	const settings = getExportSettings();
	saveExportSettings({
		...settings,
		lastUsedPath: path,
	});
}

/**
 * 清除默认 Export 路径
 */
export function clearDefaultExportPath(): void {
	setDefaultExportPath(null);
}

// ============================================================================
// 服务实例
// ============================================================================

/**
 * Export 路径服务实例
 */
export const exportPathService: ExportPathService = {
	selectExportDirectory,
	saveToPath,
	getDefaultExportPath,
	setDefaultExportPath,
	isTauriEnvironment,
};

// ============================================================================
// 带路径选择的导出
// ============================================================================

/**
 * 带路径选择的 Export 函数
 *
 * @param filename - 文件名
 * @param content - 文件内容
 * @param options - Export 选项
 * @returns Export 结果，包含成功状态和路径信息
 */
export async function exportWithPathSelection(
	filename: string,
	content: Blob | Uint8Array,
	options?: ExportWithPathOptions,
): Promise<ExportResult> {
	const { useDefaultPath = true } = options || {};

	// 非 Tauri 环境直接使用浏览器下载
	if (!isTauriEnvironment()) {
		try {
			if (content instanceof Uint8Array) {
				// 创建新的 ArrayBuffer 避免 SharedArrayBuffer 类型问题
				const buffer = new ArrayBuffer(content.length);
				new Uint8Array(buffer).set(content);
				const blob = new Blob([buffer]);
				saveAs(blob, filename);
			} else {
				saveAs(content, filename);
			}
			return { success: true };
		} catch (error) {
			return { success: false, error: String(error) };
		}
	}

	try {
		// 获取初始目录 (Requirements 5.4: 使用默认路径作为初始目录)
		let initialPath: string | null = null;

		if (useDefaultPath) {
			// 优先使用默认 Export 路径，其次使用最后使用的路径
			initialPath = getDefaultExportPath() || getLastUsedPath();
		}

		// 如果没有默认路径，尝试获取下载目录
		if (!initialPath) {
			initialPath = await getDownloadsDirectory();
		}

		// 显示目录选择对话框，使用初始路径作为起始目录
		const selectedPath = await selectExportDirectory(initialPath);

		// 用户取消选择
		if (!selectedPath) {
			return { success: false, cancelled: true };
		}

		// 保存文件
		await saveToPath(selectedPath, filename, content);

		// 更新最后使用的路径
		setLastUsedPath(selectedPath);

		return {
			success: true,
			path: `${selectedPath}/${filename}`,
		};
	} catch (error) {
		return {
			success: false,
			error: String(error),
		};
	}
}
