/**
 * @file import-export.utils.ts
 * @description 导入导出功能的纯函数工具集
 *
 * 功能说明：
 * - 文本提取
 * - 文件下载触发
 * - 文件读取
 *
 * Requirements: 1.1, 3.1, 3.2, 3.3
 */

// ==============================
// Pure Functions
// ==============================

/**
 * 从 Lexical 节点中提取纯文本
 * 递归遍历节点树，提取所有文本内容
 *
 * @param node - Lexical 节点对象
 * @returns 提取的纯文本
 */
export function extractText(node: unknown): string {
	if (!node || typeof node !== "object") return "";
	const n = node as Record<string, unknown>;
	if (n.type === "text") return (n.text as string) || "";
	if (Array.isArray(n.children)) return n.children.map(extractText).join("");
	return "";
}

/**
 * 触发文件下载
 *
 * @param filename - 下载的文件名
 * @param text - 文件内容
 * @param mimeType - MIME 类型，默认为 JSON
 */
export function triggerDownload(
	filename: string,
	text: string,
	mimeType = "application/json;charset=utf-8",
): void {
	const blob = new Blob([text], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

/**
 * 触发 Blob 文件下载
 *
 * @param filename - 下载的文件名
 * @param blob - Blob 对象
 */
export function triggerBlobDownload(filename: string, blob: Blob): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

/**
 * 读取文件内容为文本
 *
 * @param file - File 对象
 * @returns 文件内容字符串
 */
export function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ""));
		reader.onerror = reject;
		reader.readAsText(file);
	});
}
