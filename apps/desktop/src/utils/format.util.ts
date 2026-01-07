/**
 * @file utils/format.util.ts
 * @description 通用格式化工具函数
 */

/**
 * 格式化字节大小为人类可读格式
 *
 * @param bytes - 字节数
 * @returns 格式化后的字符串（如 "1.5 KB"）
 *
 * @example
 * formatBytes(0)       // "0 B"
 * formatBytes(1024)    // "1 KB"
 * formatBytes(1536)    // "1.5 KB"
 * formatBytes(1048576) // "1 MB"
 */
export const formatBytes = (bytes: number): string => {
	if (bytes === 0) return "0 B";

	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};
