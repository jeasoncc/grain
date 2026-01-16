/**
 * @file io/file/download.file.ts
 * @description 文件下载 IO 函数
 *
 * 功能说明：
 * - 触发文件下载
 * - 触发 Blob 下载
 *
 * 这些函数有 DOM 副作用，属于 IO 层
 */

// ==============================
// Download Functions
// ==============================

/**
 * 触发文件下载
 *
 * @param filename - 下载的文件名
 * @param text - 文件内容
 * @param mimeType - MIME 类型，默认为 JSON
 */
/**
 * 创建并配置下载链接元素
 *
 * @param config - 链接配置
 * @returns 配置好的链接元素
 */
function createDownloadLink(config: {
	readonly download: string
	readonly href: string
}): HTMLAnchorElement {
	const linkElement = document.createElement("a")

	// 使用 setAttribute 来设置属性，避免直接属性赋值
	linkElement.setAttribute("download", config.download)
	linkElement.setAttribute("href", config.href)

	return linkElement
}

/**
 * 执行下载操作
 *
 * @param linkElement - 配置好的链接元素
 */
function executeDownload(linkElement: HTMLAnchorElement): void {
	document.body.appendChild(linkElement)
	linkElement.click()
	linkElement.remove()
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
	const blob = new Blob([text], { type: mimeType })
	const url = URL.createObjectURL(blob)

	// 函数式组合：创建 -> 执行 -> 清理
	const linkElement = createDownloadLink({ download: filename, href: url })
	executeDownload(linkElement)
	URL.revokeObjectURL(url)
}

/**
 * 触发 Blob 文件下载
 *
 * @param filename - 下载的文件名
 * @param blob - Blob 对象
 */
/**
 * 触发 Blob 文件下载
 *
 * @param filename - 下载的文件名
 * @param blob - Blob 对象
 */
export function triggerBlobDownload(filename: string, blob: Blob): void {
	const url = URL.createObjectURL(blob)

	// 函数式组合：创建 -> 执行 -> 清理
	const linkElement = createDownloadLink({ download: filename, href: url })
	executeDownload(linkElement)
	URL.revokeObjectURL(url)
}
