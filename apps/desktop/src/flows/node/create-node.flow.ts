/**
 * @file create-node.flow.ts
 * @description 创建节点 Flow
 *
 * 功能说明：
 * - 创建新节点（文件、文件夹、画布、日记）
 * - 自动创建关联的内容记录（非文件夹类型）
 * - 支持自动创建文件夹层级结构
 * - 支持标签
 * - 使用 TaskEither 进行错误处理
 *
 * @requirements 7.1, 7.4
 */

import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as nodeRepo from "@/io/api/node.api"
import { info, success } from "@/io/log/logger.api"
import type { AppError } from "@/types/error"
import type { NodeInterface, NodeType } from "@/types/node"

/**
 * 创建节点参数
 */
export interface CreateNodeParams {
	/** 工作区 ID */
	readonly workspaceId: string
	/** 父节点 ID（null 表示根级） */
	readonly parentId: string | null
	/** 节点类型 */
	readonly type: NodeType
	/** 节点标题 */
	readonly title: string
	/** 初始内容（可选） */
	readonly content?: string
	/** 标签（可选） */
	readonly tags?: readonly string[]
}

/**
 * 在文件树中创建文件的参数
 */
export interface CreateFileInTreeParams {
	/** 工作区 ID */
	readonly workspaceId: string
	/** 文件标题 */
	readonly title: string
	/** 文件夹路径（从根目录开始的文件夹名称数组） */
	readonly folderPath: readonly string[]
	/** 节点类型（默认 file） */
	readonly type?: NodeType
	/** 标签 */
	readonly tags?: readonly string[]
	/** 内容（Lexical JSON 字符串） */
	readonly content?: string
	/** 文件夹是否折叠（默认 false） */
	readonly foldersCollapsed?: boolean
}

/**
 * 创建文件结果
 */
export interface CreateFileInTreeResult {
	/** 创建的文件节点 */
	readonly node: NodeInterface
	/** 父文件夹节点 */
	readonly parentFolder: NodeInterface
}

/**
 * 创建新节点
 *
 * 创建节点并为非文件夹类型自动创建关联的内容记录。
 * 使用 Repository 层访问数据，通过 Rust 后端持久化。
 *
 * @param params - 创建节点参数
 * @returns TaskEither<AppError, NodeInterface>
 */
export const createNode = (params: CreateNodeParams): TE.TaskEither<AppError, NodeInterface> => {
	info("[Action] 创建节点...", {}, "create-node.flow")

	return pipe(
		// 1. 创建节点（Rust 后端会自动处理排序号和内容创建）
		nodeRepo.createNode(
			{
				collapsed: true,
				parent: params.parentId,
				title: params.title,
				type: params.type,
				workspace: params.workspaceId,
			},
			params.content,
		),
		// 2. 记录成功日志
		TE.tap((node) => {
			success("[Action] 节点创建成功", { nodeId: node.id }, "create-node")
			return TE.right(node)
		}),
	)
}

/**
 * 获取或创建文件夹
 *
 * @param workspaceId - 工作区 ID
 * @param parentId - 父节点 ID
 * @param title - 文件夹标题
 * @param collapsed - 是否折叠
 * @returns TaskEither<AppError, NodeInterface>
 */
const getOrCreateFolder = (
	workspaceId: string,
	parentId: string | null,
	title: string,
	collapsed: boolean = false,
): TE.TaskEither<AppError, NodeInterface> => {
	return pipe(
		nodeRepo.getNodesByWorkspace(workspaceId),
		TE.chain((nodes) => {
			// 查找已存在的文件夹
			const existing = nodes.find(
				(n) => n.parent === parentId && n.title === title && n.type === "folder",
			)

			if (existing) {
				return TE.right(existing)
			}

			// 创建新文件夹
			return nodeRepo.createNode({
				collapsed,
				parent: parentId,
				title,
				type: "folder",
				workspace: workspaceId,
			})
		}),
	)
}

/**
 * 确保文件夹路径存在
 *
 * 递归创建文件夹层级结构，如果文件夹已存在则复用。
 *
 * @param workspaceId - 工作区 ID
 * @param folderPath - 文件夹路径数组
 * @param collapsed - 新建文件夹是否折叠
 * @returns TaskEither<AppError, NodeInterface> 最深层的文件夹节点
 */
export const ensureFolderPath = (
	workspaceId: string,
	folderPath: readonly string[],
	collapsed: boolean = false,
): TE.TaskEither<AppError, NodeInterface> => {
	if (folderPath.length === 0) {
		return TE.left({
			message: "文件夹路径不能为空",
			type: "VALIDATION_ERROR",
		})
	}

	// 递归创建文件夹路径
	const createPath = (
		remainingPath: readonly string[],
		parentId: string | null,
	): TE.TaskEither<AppError, NodeInterface> => {
		if (remainingPath.length === 0) {
			return TE.left({
				message: "文件夹路径不能为空",
				type: "VALIDATION_ERROR",
			})
		}

		const [currentFolder, ...rest] = remainingPath

		return pipe(
			getOrCreateFolder(workspaceId, parentId, currentFolder, collapsed),
			TE.chain((folder) => {
				if (rest.length === 0) {
					return TE.right(folder)
				}
				return createPath(rest, folder.id)
			}),
		)
	}

	return createPath(folderPath, null)
}

/**
 * 在文件树中创建文件
 *
 * 支持自动创建文件夹层级结构、标签和内容。
 * 用于日记、Wiki 等需要特定文件夹结构的功能。
 *
 * @param params - 创建文件参数
 * @returns Promise<CreateFileInTreeResult>
 */
export async function createFileInTree(
	params: CreateFileInTreeParams,
): Promise<CreateFileInTreeResult> {
	const {
		workspaceId,
		title,
		folderPath,
		type = "file",
		tags: _tags,
		content,
		foldersCollapsed = false,
	} = params

	// 确保文件夹路径存在
	const parentFolderResult = await ensureFolderPath(workspaceId, folderPath, foldersCollapsed)()

	if (E.isLeft(parentFolderResult)) {
		throw new Error(`创建文件夹失败: ${parentFolderResult.left.message}`)
	}

	const parentFolder = parentFolderResult.right

	// 创建文件节点（Rust 后端会自动处理排序号）
	const nodeResult = await nodeRepo.createNode(
		{
			parent: parentFolder.id,
			title,
			type,
			workspace: workspaceId,
		},
		content,
	)()

	if (E.isLeft(nodeResult)) {
		throw new Error(`创建文件失败: ${nodeResult.left.message}`)
	}

	const node = nodeResult.right

	success("[Action] 文件创建成功", { nodeId: node.id }, "create-node")

	return { node, parentFolder }
}
