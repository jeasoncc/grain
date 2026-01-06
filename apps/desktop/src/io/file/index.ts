/**
 * IO/File - 文件系统层
 *
 * 职责：文件对话框、下载等文件系统交互
 * 依赖：types/
 *
 * 包含：
 * - dialog.file.ts: 文件/目录选择对话框
 * - download.file.ts: 文件下载功能（待实现）
 */

// Dialog 相关导出
export {
	// 类型
	type DirectorySelectResult,
	type FileFilter,
	type FileSelectOptions,
	type DirectorySelectOptions,
	// 环境检测
	isTauriEnvironment,
	// 目录选择
	selectDirectory,
	selectDirectoryWithResult,
	// 系统目录
	getDownloadsDirectory,
	getDocumentsDirectory,
	getDesktopDirectory,
	getHomeDirectory,
} from "./dialog.file";

// Download 相关导出（待实现）
// export * from "./download.file";
