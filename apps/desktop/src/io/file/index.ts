/**
 * IO/File - 文件系统层
 *
 * 职责：文件对话框、下载等文件系统交互
 * 依赖：types/
 *
 * 包含：
 * - dialog.file.ts: 文件/目录选择对话框
 * - download.file.ts: 文件下载功能
 */

// Dialog 相关导出
export {
	type DirectorySelectOptions,
	// 类型
	type DirectorySelectResult,
	type FileFilter,
	type FileSelectOptions,
	getDesktopDirectory,
	getDocumentsDirectory,
	// 系统目录
	getDownloadsDirectory,
	getHomeDirectory,
	// 环境检测
	isTauriEnvironment,
	// 目录选择
	selectDirectory,
	selectDirectoryWithResult,
} from "./dialog.file"

// Download 相关导出
export { triggerBlobDownload, triggerDownload } from "./download.file"
