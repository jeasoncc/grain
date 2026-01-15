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
export function triggerDownload(
	filename: string,
	text: string,
	mimeType = "application/json;charset=utf-8",
): void {
	const blob = new Blob([text], { type: mimeType })
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")

	// Set properties functionally using Object.assign
	Object.assign(a, {
		download: filename,
		href: url,
	})

	document.body.appendChild(a)
	a.click()
	a.remove()
	URL.revokeObjectURL(url)
}

/**
 * 触发 Blob 文件下载
 *
 * @param filename - 下载的文件名
 * @param blob - Blob 对象
 */
export function triggerBlobDownload(filename: string, blob: Blob): void {
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")

	// Set properties functionally using Object.assign
	Object.assign(a, {
		download: filename,
		href: url,
	})

	document.body.appendChild(a)
	a.click()
	a.remove()
	URL.revokeObjectURL(url)
}
