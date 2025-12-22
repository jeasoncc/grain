/**
 * @file services/export-path.ts
 * @description Export 路径服务模块 - 向后兼容导出
 *
 * @deprecated 建议直接从 @/fn/export 导入
 *
 * 本文件提供向后兼容性，将导出路径功能从 fn/export 重新导出。
 * 新代码应直接使用 @/fn/export 模块。
 */

// 从 fn/export 重新导出所有导出路径功能
export {
	clearDefaultExportPath,
	// 类型
	type ExportPathService,
	type ExportSettings,
	// 服务实例
	exportPathService,
	exportWithPathSelection,
	getDefaultExportPath,
	getDownloadsDirectory,
	// 设置管理
	getExportSettings,
	getLastUsedPath,
	// 环境检测
	isTauriEnvironment,
	saveExportSettings,
	// 文件保存
	saveToPath,
	// 目录选择
	selectExportDirectory,
	setDefaultExportPath,
	setLastUsedPath,
} from "@/fn/export";
