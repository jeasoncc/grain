/**
 * @file fn/updater/index.ts
 * @description 自动更新纯函数模块统一导出
 *
 * 导出所有自动更新相关的纯函数。
 * 这些函数无副作用，可组合，可测试。
 */

export {
	checkForUpdates,
	downloadAndInstallUpdate,
	formatProgress,
	formatUpdateInfo,
	isTauriEnvironment,
	type UpdateInfo,
	type UpdateProgress,
} from "./updater.fn";
