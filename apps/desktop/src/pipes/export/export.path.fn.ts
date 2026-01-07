/**
 * @file pipes/export/export.path.fn.ts
 * @description 兼容层 - 重导出 flows/export/export-path.flow.ts
 *
 * 此文件保留用于向后兼容。
 * 实际实现已移动到 flows/export/export-path.flow.ts
 *
 * @deprecated 请直接从 @/flows/export 导入
 */

export {
	clearDefaultExportPath,
	type ExportPathService,
	type ExportResult,
	type ExportSettings,
	type ExportWithPathOptions,
	exportPathService,
	exportSettingsSchema,
	exportWithPathSelection,
	getDefaultExportPath,
	getDownloadsDirectory,
	getExportSettings,
	getLastUsedPath,
	isTauriEnvironment,
	saveExportSettings,
	saveToPath,
	selectExportDirectory,
	setDefaultExportPath,
	setLastUsedPath,
} from "@/flows/export/export-path.flow";
