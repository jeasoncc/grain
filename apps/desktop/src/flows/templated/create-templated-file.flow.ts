/**
 * @file create-templated-file.flow.ts
 * @description 模板化文件创建 Flow
 *
 * 职责：组合 pipes + io，形成模板文件创建流程
 *
 * 数据流：
 * 1. 校验参数 (pipe)
 * 2. 生成模板数据 (pipe)
 * 3. 确保文件夹路径存在 (io)
 * 4. 创建文件 (flow)
 */

import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { z } from "zod"
import { createFile } from "@/flows/file"
import * as nodeRepo from "@/io/api/node.api"
import { info, success } from "@/io/log/logger.api"
import type { AppError } from "@/types/error"
import type { FileNodeType, NodeInterface } from "@/types/node"

// ==============================
// Types
// ==============================

export interface TemplateConfig<T> {
	readonly name: string
	readonly rootFolder: string
	readonly fileType: FileNodeType
	readonly tag: string
	readonly generateTemplate: (params: T) => string
	readonly generateFolderPath: (params: T) => readonly string[]
	readonly generateTitle: (params: T) => string
	readonly paramsSchema: z.ZodSchema<T>
	readonly foldersCollapsed?: boolean
	readonly skipJsonParse?: boolean
}

export interface TemplatedFileParams<T> {
	readonly workspaceId: string
	readonly templateParams: T
}

export interface TemplatedFileResult {
	readonly node: NodeInterface
	readonly content: string
	readonly parsedContent: unknown
}

// ==============================
// Validation Schema
// ==============================

const workspaceIdSchema = z.object({
	workspaceId: z.string().min(1, "工作区 ID 不能为空"),
})

// ==============================
// Internal Pipes
// ==============================

/**
 * 校验参数
 */
const validateParams = <T>(
	config: TemplateConfig<T>,
	params: TemplatedFileParams<T>,
): E.Either<AppError, { workspaceId: string; templateParams: T }> => {
	// 校验 workspaceId
	const baseResult = workspaceIdSchema.safeParse({ workspaceId: params.workspaceId })
	if (!baseResult.success) {
		return E.left({
			message: `参数校验失败: ${baseResult.error.issues[0]?.message}`,
			type: "VALIDATION_ERROR",
		})
	}

	// 校验模板参数
	const templateResult = config.paramsSchema.safeParse(params.templateParams)
	if (!templateResult.success) {
		return E.left({
			message: `模板参数校验失败: ${templateResult.error.issues[0]?.message}`,
			type: "VALIDATION_ERROR",
		})
	}

	return E.right({
		templateParams: templateResult.data,
		workspaceId: params.workspaceId,
	})
}

/**
 * 生成模板数据
 */
const generateTemplateData = <T>(
	config: TemplateConfig<T>,
	templateParams: T,
): {
	content: string
	folderPath: readonly string[]
	title: string
	parsedContent: unknown
} => {
	const content = config.generateTemplate(templateParams)
	const folderPath = config.generateFolderPath(templateParams)
	const title = config.generateTitle(templateParams)

	// 解析内容
	let parsedContent: unknown = content
	if (!config.skipJsonParse) {
		try {
			parsedContent = JSON.parse(content)
		} catch {
			// 保持原始字符串
		}
	}

	return { content, folderPath, parsedContent, title }
}

/**
 * 确保文件夹路径存在
 */
const ensureFolderPath = (
	workspaceId: string,
	folderPath: readonly string[],
	collapsed: boolean,
): TE.TaskEither<AppError, NodeInterface> => {
	if (folderPath.length === 0) {
		return TE.left({ message: "文件夹路径不能为空", type: "VALIDATION_ERROR" })
	}

	// 递归创建文件夹
	const createFoldersRecursively = (
		remainingPath: readonly string[],
		parentId: string | null,
	): TE.TaskEither<AppError, NodeInterface> => {
		if (remainingPath.length === 0) {
			return TE.left({ message: "路径为空", type: "VALIDATION_ERROR" })
		}

		const [current, ...rest] = remainingPath

		return pipe(
			// 获取工作区所有节点
			nodeRepo.getNodesByWorkspace(workspaceId),
			// 查找或创建当前文件夹
			TE.chain((nodes) => {
				// 在指定 parent 下查找
				const folder = nodes.find(
					(n) => n.parent === parentId && n.title === current && n.type === "folder",
				)

				if (folder) {
					return TE.right(folder)
				}

				// 创建新文件夹
				return nodeRepo.createNode({
					collapsed,
					parent: parentId,
					title: current,
					type: "folder",
					workspace: workspaceId,
				})
			}),
			// 继续创建子文件夹
			TE.chain((folder) => {
				if (rest.length === 0) {
					return TE.right(folder)
				}
				return createFoldersRecursively(rest, folder.id)
			}),
		)
	}

	return createFoldersRecursively(folderPath, null)
}

// ==============================
// Flow
// ==============================

/**
 * 创建模板化文件的高阶函数
 */
export const createTemplatedFile =
	<T>(config: TemplateConfig<T>) =>
	(params: TemplatedFileParams<T>): TE.TaskEither<AppError, TemplatedFileResult> => {
		info(`[Flow] 创建${config.name}...`)

		return pipe(
			// 1. 校验参数
			TE.fromEither(validateParams(config, params)),

			// 2. 生成模板数据
			TE.map(({ workspaceId, templateParams }) => ({
				workspaceId,
				...generateTemplateData(config, templateParams),
			})),

			// 3. 确保文件夹路径存在
			TE.chain(({ workspaceId, content, folderPath, title, parsedContent }) =>
				pipe(
					ensureFolderPath(
						workspaceId,
						[config.rootFolder, ...folderPath],
						config.foldersCollapsed ?? true,
					),
					TE.map((parentFolder) => ({
						content,
						parentFolder,
						parsedContent,
						title,
						workspaceId,
					})),
				),
			),

			// 4. 创建文件
			TE.chain(({ workspaceId, parentFolder, title, content, parsedContent }) =>
				pipe(
					createFile({
						collapsed: true,
						content,
						parentId: parentFolder.id,
						tags: [config.tag],
						title,
						type: config.fileType,
						workspaceId,
					}),
					TE.map((result) => ({
						content,
						node: result.node,
						parsedContent,
					})),
				),
			),

			// 5. 记录成功
			TE.tap((result) => {
				success(`[Flow] ${config.name}创建成功`, { nodeId: result.node.id })
				return TE.right(result)
			}),
		)
	}

/**
 * 创建模板化文件（Promise 版本）
 */
export const createTemplatedFileAsync = <T>(config: TemplateConfig<T>) => {
	const createFn = createTemplatedFile(config)

	return async (params: TemplatedFileParams<T>): Promise<TemplatedFileResult> => {
		const result = await createFn(params)()
		if (E.isLeft(result)) {
			throw new Error(result.left.message)
		}
		return result.right
	}
}
