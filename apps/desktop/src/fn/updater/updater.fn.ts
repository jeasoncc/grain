/**
 * @file fn/updater/updater.fn.ts
 * @description 自动更新纯函数
 *
 * 提供应用自动更新功能的纯函数实现。
 * 这些函数无副作用，可组合，可测试。
 */

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";

// ==============================
// Types
// ==============================

export interface UpdateInfo {
	readonly available: boolean;
	readonly currentVersion: string;
	readonly latestVersion?: string;
	readonly body?: string;
}

export interface UpdateProgress {
	readonly downloaded: number;
	readonly total: number;
	readonly percentage: number;
}

// ==============================
// Environment Detection
// ==============================

/**
 * 检查是否在 Tauri 环境中运行
 */
export const isTauriEnvironment = (): boolean => {
	return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

// ==============================
// Update Check Functions
// ==============================

/**
 * 检查更新
 */
export const checkForUpdates = (): TE.TaskEither<AppError, UpdateInfo> =>
	TE.tryCatch(
		async (): Promise<UpdateInfo> => {
			logger.info("[Updater] 检查更新...");

			if (!isTauriEnvironment()) {
				logger.info("[Updater] 非 Tauri 环境，跳过更新检查");
				return {
					available: false,
					currentVersion: "dev",
				};
			}

			try {
				const { check } = await import("@tauri-apps/plugin-updater");
				const update = await check();

				if (update?.available) {
					logger.success("[Updater] 发现新版本:", update.version);
					return {
						available: true,
						currentVersion: update.currentVersion,
						latestVersion: update.version,
						body: update.body,
					};
				}

				logger.info("[Updater] 已是最新版本");
				return {
					available: false,
					currentVersion: update?.currentVersion || "unknown",
				};
			} catch (error) {
				logger.error("[Updater] 检查更新失败:", error);

				// 提供更有用的错误信息
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				if (
					errorMessage.includes("404") ||
					errorMessage.includes("Not Found")
				) {
					throw new Error("尚未发布任何版本");
				}
				if (
					errorMessage.includes("network") ||
					errorMessage.includes("fetch")
				) {
					throw new Error("网络错误 - 请检查网络连接");
				}
				throw error;
			}
		},
		(error): AppError => ({
			type: "EXPORT_ERROR", // 使用现有的错误类型，或者可以扩展为 UPDATE_ERROR
			message: `检查更新失败: ${error instanceof Error ? error.message : String(error)}`,
		}),
	);

/**
 * 下载并安装更新
 */
export const downloadAndInstallUpdate = (
	onProgress?: (progress: UpdateProgress) => void,
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async (): Promise<void> => {
			logger.start("[Updater] 开始下载更新...");

			if (!isTauriEnvironment()) {
				throw new Error("更新功能仅在桌面应用中可用");
			}

			const { check } = await import("@tauri-apps/plugin-updater");
			const { relaunch } = await import("@tauri-apps/plugin-process");

			const update = await check();

			if (!update) {
				throw new Error("没有可用的更新");
			}

			let downloaded = 0;
			let contentLength = 0;

			// 下载并显示进度
			await update.downloadAndInstall((event) => {
				switch (event.event) {
					case "Started":
						contentLength = event.data.contentLength || 0;
						logger.info(`[Updater] 开始下载 ${contentLength} 字节`);
						break;
					case "Progress": {
						downloaded += event.data.chunkLength;
						const percentage =
							contentLength > 0 ? (downloaded / contentLength) * 100 : 0;

						const progress: UpdateProgress = {
							downloaded,
							total: contentLength,
							percentage,
						};

						onProgress?.(progress);
						logger.info(`[Updater] 下载进度: ${percentage.toFixed(1)}%`);
						break;
					}
					case "Finished":
						logger.success("[Updater] 下载完成");
						break;
				}
			});

			// 安装完成后重启应用
			logger.info("[Updater] 重启应用以完成更新...");
			await relaunch();
		},
		(error): AppError => ({
			type: "EXPORT_ERROR", // 使用现有的错误类型
			message: `下载安装更新失败: ${error instanceof Error ? error.message : String(error)}`,
		}),
	);

// ==============================
// Utility Functions
// ==============================

/**
 * 格式化版本信息
 */
export const formatUpdateInfo = (updateInfo: UpdateInfo): string => {
	if (!updateInfo.available) {
		return `当前版本: ${updateInfo.currentVersion} (已是最新版本)`;
	}

	return `当前版本: ${updateInfo.currentVersion} → 最新版本: ${updateInfo.latestVersion || "未知"}`;
};

/**
 * 格式化下载进度
 */
export const formatProgress = (progress: UpdateProgress): string => {
	const { downloaded, total, percentage } = progress;

	if (total > 0) {
		const downloadedMB = (downloaded / 1024 / 1024).toFixed(1);
		const totalMB = (total / 1024 / 1024).toFixed(1);
		return `${downloadedMB}MB / ${totalMB}MB (${percentage.toFixed(1)}%)`;
	}

	return `${(downloaded / 1024 / 1024).toFixed(1)}MB`;
};
