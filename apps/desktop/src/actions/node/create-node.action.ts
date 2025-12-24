/**
 * @file create-node.action.ts
 * @description 创建节点 Action
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

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { addContent } from "@/db/content.db.fn";
import { addNode, getNextOrder, getNodesByWorkspace } from "@/db/node.db.fn";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";
import type { NodeInterface, NodeType } from "@/types/node";

/**
 * 创建节点参数
 */
export interface CreateNodeParams {
	/** 工作区 ID */
	readonly workspaceId: string;
	/** 父节点 ID（null 表示根级） */
	readonly parentId: string | null;
	/** 节点类型 */
	readonly type: NodeType;
	/** 节点标题 */
	readonly title: string;
	/** 初始内容（可选） */
	readonly content?: string;
	/** 标签（可选） */
	readonly tags?: string[];
}

/**
 * 在文件树中创建文件的参数
 */
export interface CreateFileInTreeParams {
	/** 工作区 ID */
	readonly workspaceId: string;
	/** 文件标题 */
	readonly title: string;
	/** 文件夹路径（从根目录开始的文件夹名称数组） */
	readonly folderPath: string[];
	/** 节点类型（默认 file） */
	readonly type?: "file" | "diary" | "canvas";
	/** 标签 */
	readonly tags?: string[];
	/** 内容（Lexical JSON 字符串） */
	readonly content?: string;
	/** 文件夹是否折叠（默认 false） */
	readonly foldersCollapsed?: boolean;
}

/**
 * 创建文件结果
 */
export interface CreateFileInTreeResult {
	/** 创建的文件节点 */
	readonly node: NodeInterface;
	/** 父文件夹节点 */
	readonly parentFolder: NodeInterface;
}

/**
 * 创建新节点
 *
 * 创建节点并为非文件夹类型自动创建关联的内容记录。
 *
 * @param params - 创建节点参数
 * @returns TaskEither<AppError, NodeInterface>
 */
export const createNode = (
	params: CreateNodeParams,
): TE.TaskEither<AppError, NodeInterface> => {
	logger.start("[Action] 创建节点...");

	return pipe(
		// 1. 获取下一个排序号
		getNextOrder(params.parentId, params.workspaceId),
		// 2. 创建节点
		TE.chain((order) =>
			addNode(params.workspaceId, params.title, {
				parent: params.parentId,
				type: params.type,
				order,
				collapsed: true,
				tags: params.tags,
			}),
		),
		// 3. 为非文件夹类型创建内容记录
		TE.chainFirst((node) => {
			if (node.type !== "folder") {
				return addContent(node.id, params.content || "");
			}
			return TE.right(undefined);
		}),
		// 4. 记录成功日志
		TE.tap((node) => {
			logger.success("[Action] 节点创建成功:", node.id);
			return TE.right(node);
		}),
	);
};

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
		getNodesByWorkspace(workspaceId),
		TE.chain((nodes) => {
			// 查找已存在的文件夹
			const existing = nodes.find(
				(n) =>
					n.parent === parentId && n.title === title && n.type === "folder",
			);

			if (existing) {
				return TE.right(existing);
			}

			// 创建新文件夹
			return pipe(
				getNextOrder(parentId, workspaceId),
				TE.chain((order) =>
					addNode(workspaceId, title, {
						parent: parentId,
						type: "folder",
						collapsed,
						order,
					}),
				),
			);
		}),
	);
};

/**
 * 确保文件夹路径存在
 *
 * @param workspaceId - 工作区 ID
 * @param folderPath - 文件夹路径数组
 * @param collapsed - 新建文件夹是否折叠
 * @returns TaskEither<AppError, NodeInterface> 最深层的文件夹节点
 */
const ensureFolderPath = (
	workspaceId: string,
	folderPath: string[],
	collapsed: boolean = false,
): TE.TaskEither<AppError, NodeInterface> => {
	if (folderPath.length === 0) {
		return TE.left({
			type: "VALIDATION_ERROR",
			message: "文件夹路径不能为空",
		});
	}

	// 递归创建文件夹路径
	const createPath = (
		remainingPath: string[],
		parentId: string | null,
	): TE.TaskEither<AppError, NodeInterface> => {
		if (remainingPath.length === 0) {
			return TE.left({
				type: "VALIDATION_ERROR",
				message: "文件夹路径不能为空",
			});
		}

		const [currentFolder, ...rest] = remainingPath;

		return pipe(
			getOrCreateFolder(workspaceId, parentId, currentFolder, collapsed),
			TE.chain((folder) => {
				if (rest.length === 0) {
					return TE.right(folder);
				}
				return createPath(rest, folder.id);
			}),
		);
	};

	return createPath(folderPath, null);
};

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
		tags,
		content,
		foldersCollapsed = false,
	} = params;

	// 确保文件夹路径存在
	const parentFolderResult = await ensureFolderPath(
		workspaceId,
		folderPath,
		foldersCollapsed,
	)();

	if (E.isLeft(parentFolderResult)) {
		throw new Error(`创建文件夹失败: ${parentFolderResult.left.message}`);
	}

	const parentFolder = parentFolderResult.right;

	// 获取下一个排序号
	const nextOrderResult = await getNextOrder(parentFolder.id, workspaceId)();
	const nextOrder = E.isRight(nextOrderResult) ? nextOrderResult.right : 0;

	// 创建文件节点
	const nodeResult = await addNode(workspaceId, title, {
		parent: parentFolder.id,
		type,
		order: nextOrder,
		tags,
	})();

	if (E.isLeft(nodeResult)) {
		throw new Error(`创建文件失败: ${nodeResult.left.message}`);
	}

	const node = nodeResult.right;

	// 创建内容记录
	if (content) {
		await addContent(node.id, content)();
	}

	logger.success("[Action] 文件创建成功:", node.id);

	return { node, parentFolder };
}