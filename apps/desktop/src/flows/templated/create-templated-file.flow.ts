/**
 * @file create-templated-file.flow.ts
 * @description 模板化文件创建高阶函数
 *
 * 功能说明：
 * - 提供通用的模板化文件创建模式
 * - 支持自定义模板生成、文件夹结构、标题生成
 * - 使用函数式编程模式，避免重复代码
 * - 支持类型安全的参数传递
 * - 通过 createFile action 确保文件操作通过队列执行
 *
 * 设计理念：
 * - 高阶函数：接收配置，返回具体的创建函数
 * - 函数式组合：使用 fp-ts pipe 进行数据流处理
 * - 类型安全：泛型支持不同类型的参数
 * - 错误处理：使用 TaskEither 进行显式错误处理
 * - 队列执行：通过 createFile action 确保串行执行
 *
 * @requirements 抽象重复模式，提高代码复用性
 * @see .kiro/specs/editor-tabs-dataflow-refactor/design.md Property 8
 */

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { z } from "zod";
import dayjs from "dayjs";
import type { SerializedEditorState } from "lexical";
import * as nodeRepo from "@/io/api/node.api";
import { success, info, warn } from "@/io/log/logger.api";
import { fileOperationQueue } from "@/pipes/queue/queue.pipe";
import { findTabByNodeId, evictLRUEditorStates } from "@/pipes/editor-tab";
import { useEditorTabsStore } from "@/state/editor-tabs.state";
import { EditorTabBuilder, EditorStateBuilder } from "@/types/editor-tab";
import type { TabType, EditorTab, EditorInstanceState } from "@/types/editor-tab";
import type { FileNodeType, NodeInterface } from "@/types/node";
import type { AppError } from "@/types/error";

// ==============================
// Types
// ==============================

/**
 * 模板配置接口
 *
 * 泛型 T 表示具体模板的参数类型
 */
export interface TemplateConfig<T> {
	/** 模块名称（用于日志） */
	readonly name: string;
	/** 根文件夹名称 */
	readonly rootFolder: string;
	/** 文件类型（使用 FileNodeType，排除 folder） */
	readonly fileType: FileNodeType;
	/** 默认标签 */
	readonly tag: string;
	/** 生成模板内容的函数 */
	readonly generateTemplate: (params: T) => string;
	/** 生成文件夹路径的函数 */
	readonly generateFolderPath: (params: T) => string[];
	/** 生成文件标题的函数 */
	readonly generateTitle: (params: T) => string;
	/** 参数校验 Schema */
	readonly paramsSchema: z.ZodSchema<T>;
	/** 文件夹是否折叠（可选，默认 true） */
	readonly foldersCollapsed?: boolean;
	/** 是否跳过 JSON 解析（用于纯文本内容如 Mermaid/PlantUML，可选，默认 false） */
	readonly skipJsonParse?: boolean;
}

/**
 * 模板化文件创建参数
 *
 * 包含工作区 ID 和具体模板参数
 */
export interface TemplatedFileParams<T> {
	/** 工作区 ID */
	readonly workspaceId: string;
	/** 模板特定参数 */
	readonly templateParams: T;
}

/**
 * 模板化文件创建结果
 */
export interface TemplatedFileResult {
	/** 创建的文件节点 */
	readonly node: NodeInterface;
	/** 生成的内容（Lexical JSON 字符串） */
	readonly content: string;
	/** 解析后的内容（Lexical JSON 对象） */
	readonly parsedContent: unknown;
}

// ==============================
// Schema
// ==============================

/**
 * 基础参数 Schema（工作区 ID）
 */
const baseParamsSchema = z.object({
	workspaceId: z.string().uuid({ message: "工作区 ID 必须是有效的 UUID" }),
});

// ==============================
// Internal Helper Functions (避免 flows/ 依赖 flows/)
// ==============================

/**
 * 获取或创建文件夹（内联版本）
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
				(n) =>
					n.parent === parentId && n.title === title && n.type === "folder",
			);

			if (existing) {
				return TE.right(existing);
			}

			// 创建新文件夹
			return nodeRepo.createNode({
				workspace: workspaceId,
				parent: parentId,
				type: "folder",
				title,
				collapsed,
			});
		}),
	);
};

/**
 * 确保文件夹路径存在（内联版本）
 *
 * 递归创建文件夹层级结构，如果文件夹已存在则复用。
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
 * 创建文件（内联版本，避免 flows/ 依赖 flows/）
 *
 * @param params - 创建文件参数
 * @returns TaskEither<AppError, { node: NodeInterface; tabId: string | null }>
 */
const createFileInternal = (params: {
	readonly workspaceId: string;
	readonly parentId: string | null;
	readonly title: string;
	readonly type: FileNodeType;
	readonly content?: string;
	readonly tags?: string[];
	readonly collapsed?: boolean;
}): TE.TaskEither<AppError, { node: NodeInterface; tabId: string | null }> => {
	return pipe(
		TE.tryCatch(
			() =>
				fileOperationQueue.add(async () => {
					const {
						workspaceId,
						parentId,
						title,
						type,
						content = "",
						tags,
						collapsed = true,
					} = params;

					// 1. 获取排序号
					const orderResult = await nodeRepo.getNextSortOrder(
						workspaceId,
						parentId,
					)();
					const order = E.isRight(orderResult) ? orderResult.right : 0;

					// 2. 创建节点（带初始内容和标签）
					const nodeResult = await nodeRepo.createNode(
						{
							workspace: workspaceId,
							title,
							parent: parentId,
							type,
							order,
							collapsed,
						},
						content, // Always pass content since FileNodeType excludes folders
						tags,
					)();

					if (E.isLeft(nodeResult)) {
						throw new Error(nodeResult.left.message);
					}

					const node = nodeResult.right;

					// 3. 更新 Store（always update since FileNodeType excludes folders）
					let tabId: string | null = null;
					// Since type is FileNodeType (excludes folders), always update store
					const store = useEditorTabsStore.getState();

						// 解析内容（如果有）
						let parsedContent: SerializedEditorState | undefined;
						if (content) {
							try {
								parsedContent = JSON.parse(content) as SerializedEditorState;
							} catch (error) {
								warn("[CreateFile] 内容解析失败，使用空文档");
								parsedContent = undefined;
							}
						}

						// 打开 tab：直接操作 state
						const existingTab = findTabByNodeId(
							store.tabs as EditorTab[],
							node.id,
						);

						if (existingTab) {
							// Tab 已存在，激活它
							store.setActiveTabId(existingTab.id);
							if (store.editorStates[existingTab.id]) {
								store.updateEditorState(existingTab.id, {
									lastModified: dayjs().valueOf(),
								});
							}
							tabId = existingTab.id;
						} else {
							// 创建新 tab
							const newTab = EditorTabBuilder.create()
								.workspaceId(workspaceId)
								.nodeId(node.id)
								.title(title)
								.type(type as TabType)
								.build();

							// 如果有初始内容，使用它；否则创建空状态
							const newEditorState = parsedContent
								? EditorStateBuilder.fromDefault()
										.serializedState(parsedContent)
										.build()
								: EditorStateBuilder.fromDefault().build();

							// 使用原子操作同时添加 tab、设置 editorState 和激活 tab
							store.addTabWithState(newTab as EditorTab, newEditorState);

							// LRU eviction
							const MAX_EDITOR_STATES = 10;
							const openTabIds = new Set(store.tabs.map((t: EditorTab) => t.id));
							const evictedStates = evictLRUEditorStates(
								store.editorStates,
								store.activeTabId,
								openTabIds as ReadonlySet<string>,
								MAX_EDITOR_STATES,
							);
							store.setEditorStates(evictedStates as Record<string, EditorInstanceState>);

							tabId = newTab.id;
						}

					return {
						node,
						tabId,
					};
				}),
			(error): AppError => ({
				type: "DB_ERROR",
				message: `创建文件失败: ${error instanceof Error ? error.message : String(error)}`,
			}),
		),
		// 处理 p-queue 返回 undefined 的情况
		TE.chain((result) =>
			result
				? TE.right(result)
				: TE.left<AppError>({
						type: "DB_ERROR",
						message: "创建文件失败: 队列返回空结果",
					}),
		),
	);
};

// ==============================
// High-Order Function
// ==============================

/**
 * 创建模板化文件的高阶函数
 *
 * 这是一个高阶函数，接收模板配置，返回具体的文件创建函数。
 * 使用函数式编程模式，避免重复的模板文件创建逻辑。
 *
 * @param config - 模板配置
 * @returns 具体的文件创建函数
 *
 * @example
 * ```typescript
 * // 定义日记模板配置
 * const diaryConfig: TemplateConfig<DiaryParams> = {
 *   rootFolder: "Diary",
 *   fileType: "diary",
 *   tag: "diary",
 *   generateTemplate: (params) => generateDiaryContent(params.date),
 *   generateFolderPath: (params) => getDiaryFolderStructure(params.date),
 *   generateTitle: (params) => getDiaryTitle(params.date),
 *   paramsSchema: diaryParamsSchema,
 * };
 *
 * // 创建具体的日记创建函数
 * export const createDiary = createTemplatedFile(diaryConfig);
 * ```
 */
export const createTemplatedFile = <T>(config: TemplateConfig<T>) => {
	/**
	 * 具体的文件创建函数
	 *
	 * @param params - 包含工作区 ID 和模板参数的对象
	 * @returns TaskEither<AppError, TemplatedFileResult>
	 */
	return (
		params: TemplatedFileParams<T>,
	): TE.TaskEither<AppError, TemplatedFileResult> => {
		info(`[Action] 创建${config.name}...`);

		return pipe(
			// 1. 校验基础参数（工作区 ID）
			baseParamsSchema.safeParse({ workspaceId: params.workspaceId }),
			(result) =>
				result.success
					? E.right(result.data)
					: E.left({
							type: "VALIDATION_ERROR" as const,
							message: `基础参数校验失败: ${result.error.issues[0]?.message || "未知错误"}`,
						}),
			TE.fromEither,
			// 2. 校验模板特定参数
			TE.chain(() =>
				pipe(
					config.paramsSchema.safeParse(params.templateParams),
					(result) =>
						result.success
							? E.right(result.data)
							: E.left({
									type: "VALIDATION_ERROR" as const,
									message: `模板参数校验失败: ${result.error.issues[0]?.message || "未知错误"}`,
								}),
					TE.fromEither,
				),
			),
			// 3. 生成模板数据
			TE.map((validTemplateParams) => {
				const content = config.generateTemplate(validTemplateParams);
				const folderPath = config.generateFolderPath(validTemplateParams);
				const title = config.generateTitle(validTemplateParams);

				return {
					validTemplateParams,
					content,
					folderPath,
					title,
				};
			}),
			// 4. 解析内容（验证 JSON 格式，或跳过解析）
			TE.chain(({ validTemplateParams, content, folderPath, title }) => {
				// 如果配置了跳过 JSON 解析（如 Mermaid/PlantUML 纯文本内容）
				if (config.skipJsonParse) {
					return TE.right({
						validTemplateParams,
						content,
						folderPath,
						title,
						parsedContent: content, // 纯文本内容直接使用原始字符串
					});
				}

				// 默认：解析 JSON 内容
				return pipe(
					E.tryCatch(
						() => JSON.parse(content),
						(error) => ({
							type: "VALIDATION_ERROR" as const,
							message: `内容解析失败: ${error instanceof Error ? error.message : String(error)}`,
						}),
					),
					TE.fromEither,
					TE.map((parsedContent) => ({
						validTemplateParams,
						content,
						folderPath,
						title,
						parsedContent,
					})),
				);
			}),
			// 5. 确保文件夹路径存在，然后通过内联 createFile 创建文件（通过队列执行）
			TE.chain(({ content, folderPath, title, parsedContent }) =>
				pipe(
					// 5.1 确保文件夹路径存在
					ensureFolderPath(
						params.workspaceId,
						[config.rootFolder, ...folderPath],
						config.foldersCollapsed ?? true,
					),
					// 5.2 成功后，通过内联 createFile 创建文件（通过队列串行执行）
					TE.chain((parentFolder) =>
						pipe(
							createFileInternal({
								workspaceId: params.workspaceId,
								parentId: parentFolder.id,
								title,
								type: config.fileType,
								content,
								tags: [config.tag],
								collapsed: true,
							}),
							// 5.3 成功后，组装返回结果
							TE.map((result) => ({
								node: result.node,
								content,
								parsedContent,
							})),
						),
					),
				),
			),
			// 6. 记录成功日志
			TE.tap((result) => {
				success(`[Action] ${config.name}创建成功:`, { nodeId: result.node.id });
				return TE.right(result);
			}),
		);
	};
};

/**
 * 创建模板化文件的异步版本
 *
 * 用于在组件中直接调用，返回 Promise。
 *
 * @param config - 模板配置
 * @returns 异步文件创建函数
 */
export const createTemplatedFileAsync = <T>(config: TemplateConfig<T>) => {
	const createFn = createTemplatedFile(config);

	/**
	 * 异步文件创建函数
	 *
	 * @param params - 创建参数
	 * @returns Promise<TemplatedFileResult>
	 * @throws Error 如果创建失败
	 */
	return async (
		params: TemplatedFileParams<T>,
	): Promise<TemplatedFileResult> => {
		const result = await createFn(params)();

		if (E.isLeft(result)) {
			throw new Error(result.left.message);
		}

		return result.right;
	};
};
