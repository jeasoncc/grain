/**
 * @file fn/import/import.file.fn.ts
 * @description 文件读取纯函数
 *
 * 功能说明：
 * - 读取文件内容为文本
 * - 文件类型验证
 *
 * 这些函数封装了文件读取操作。
 */

import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"

// ==============================
// Types
// ==============================

/**
 * 文件读取错误类型
 */
export type FileReadError =
	| { readonly type: "READ_ERROR"; readonly message: string }
	| { readonly type: "INVALID_FILE"; readonly message: string }

// ==============================
// Pure Functions
// ==============================

/**
 * 读取文件内容为文本
 *
 * @param file - File 对象
 * @returns 文件内容字符串
 */
export function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()

		// Set event handlers functionally
		reader.addEventListener("load", () => resolve(String(reader.result ?? "")))
		reader.addEventListener("error", reject)

		reader.readAsText(file)
	})
}

/**
 * 读取文件内容为文本（带错误处理）
 *
 * @param file - File 对象
 * @returns TaskEither<FileReadError, string>
 */
export function readFileAsTextSafe(file: File): TE.TaskEither<FileReadError, string> {
	return TE.tryCatch(
		async () => {
			const content = await readFileAsText(file)
			return content
		},
		(error) => ({
			type: "READ_ERROR" as const,
			message: `文件读取失败: ${error instanceof Error ? error.message : String(error)}`,
		}),
	)
}

/**
 * 验证文件类型
 *
 * @param file - File 对象
 * @param allowedTypes - 允许的 MIME 类型数组
 * @returns Either<FileReadError, File>
 */
export function validateFileType(
	file: File,
	allowedTypes: readonly string[],
): E.Either<FileReadError, File> {
	if (allowedTypes.length === 0) {
		return E.right(file)
	}

	if (!allowedTypes.includes(file.type)) {
		return E.left({
			type: "INVALID_FILE",
			message: `不支持的文件类型: ${file.type}。允许的类型: ${allowedTypes.join(", ")}`,
		})
	}

	return E.right(file)
}

/**
 * 验证文件扩展名
 *
 * @param file - File 对象
 * @param allowedExtensions - 允许的扩展名数组（不含点号）
 * @returns Either<FileReadError, File>
 */
export function validateFileExtension(
	file: File,
	allowedExtensions: readonly string[],
): E.Either<FileReadError, File> {
	if (allowedExtensions.length === 0) {
		return E.right(file)
	}

	const nameParts = file.name.split(".") as readonly string[]
	const extension = nameParts[nameParts.length - 1]?.toLowerCase() ?? ""

	if (!allowedExtensions.includes(extension)) {
		return E.left({
			type: "INVALID_FILE",
			message: `不支持的文件扩展名: .${extension}。允许的扩展名: ${allowedExtensions.map((e) => `.${e}`).join(", ")}`,
		})
	}

	return E.right(file)
}
