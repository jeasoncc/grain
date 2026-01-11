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
import { createFile } from "@/flows/file";
import { ensureFolderPath } from "@/flows/node";
import logger from "@/io/log";
import type { FileNodeType, NodeInterface } from "@/types/node";
import type { AppError } from "@/utils/error.util";

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
		logger.start(`[Action] 创建${config.name}...`);

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
			// 5. 确保文件夹路径存在，然后通过 createFile action 创建文件（通过队列执行）
			TE.chain(({ content, folderPath, title, parsedContent }) =>
				pipe(
					// 5.1 确保文件夹路径存在
					ensureFolderPath(
						params.workspaceId,
						[config.rootFolder, ...folderPath],
						config.foldersCollapsed ?? true,
					),
					// 5.2 成功后，通过 createFile action 创建文件（通过队列串行执行）
					TE.chain((parentFolder) =>
						pipe(
							createFile({
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
				logger.success(`[Action] ${config.name}创建成功:`, result.node.id);
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
