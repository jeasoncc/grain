/**
 * @file create-file.action.ts
 * @description 创建文件 Action - 重导出 flows/file
 *
 * @deprecated 请直接从 @/flows/file 导入
 */

export {
	createFile,
	createFileAsync,
	type CreateFileParams,
	type CreateFileResult,
} from "@/flows/file/create-file.action";
