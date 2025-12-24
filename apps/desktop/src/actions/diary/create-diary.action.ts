/**
 * @file create-diary.action.ts
 * @description 创建日记 Action
 *
 * 功能说明：
 * - 创建新日记条目
 * - 自动生成日记文件夹结构（year > month > day）
 * - 自动生成日记内容（Lexical JSON）
 * - 支持自定义日期
 * - 使用 TaskEither 进行错误处理
 *
 * @requirements 1.1, 1.5, 3.1
 */

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { z } from "zod";
import { createFileInTree } from "@/actions/node";
import {
	generateDiaryContent,
	getDiaryFolderStructure,
} from "@/domain/diary/diary.utils";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";
import type { NodeInterface } from "@/types/node";

// ==============================
// Schema
// ==============================

/**
 * 创建日记参数 Schema
 */
const createDiaryParamsSchema = z.object({
	workspaceId: z.string().uuid("工作区 ID 必须是有效的 UUID"),
	date: z.date().optional(),
});

// ==============================
// Constants
// ==============================

/** Diary root folder name */
export const DIARY_ROOT_FOLDER = "Diary";

// ==============================
// Types
// ==============================

/**
 * 日记创建结果
 */
export interface DiaryCreationResult {
	/** 创建的日记节点 */
	readonly node: NodeInterface;
	/** 生成的内容（Lexical JSON 字符串） */
	readonly content: string;
	/** 解析后的内容（Lexical JSON 对象） */
	readonly parsedContent: unknown;
}

/**
 * 创建日记参数
 */
export interface CreateDiaryParams {
	/** 工作区 ID */
	readonly workspaceId: string;
	/** 日期（可选，默认为当前时间） */
	readonly date?: Date;
}

// ==============================
// Actions
// ==============================

/**
 * 创建日记条目
 *
 * 创建日记并自动生成文件夹结构和内容。
 * 文件夹结构：Diary > year-YYYY-{Zodiac} > month-MM-{Month} > day-DD-{Weekday} > diary-{timestamp}-HH-mm-ss
 *
 * @param params - 创建日记参数
 * @returns TaskEither<AppError, DiaryCreationResult>
 */
export const createDiary = (
	params: CreateDiaryParams,
): TE.TaskEither<AppError, DiaryCreationResult> => {
	logger.start("[Action] 创建日记...");

	return pipe(
		// 1. 校验参数
		createDiaryParamsSchema.safeParse(params),
		(result) =>
			result.success
				? E.right(result.data)
				: E.left({
						type: "VALIDATION_ERROR" as const,
						message: `参数校验失败: ${result.error.issues[0]?.message || "未知错误"}`,
					}),
		TE.fromEither,
		// 2. 准备数据
		TE.map((validParams) => {
			const date = validParams.date || new Date();
			const structure = getDiaryFolderStructure(date);
			const content = generateDiaryContent(date);
			return { validParams, date, structure, content };
		}),
		// 3. 解析内容
		TE.chain(({ validParams, structure, content }) =>
			pipe(
				E.tryCatch(
					() => JSON.parse(content),
					(error) => ({
						type: "VALIDATION_ERROR" as const,
						message: `内容解析失败: ${error instanceof Error ? error.message : String(error)}`,
					}),
				),
				TE.fromEither,
				TE.map((parsedContent) => ({
					validParams,
					structure,
					content,
					parsedContent,
				})),
			),
		),
		// 4. 创建文件
		TE.chain(({ validParams, structure, content, parsedContent }) =>
			pipe(
				TE.tryCatch(
					() => createFileInTree({
						workspaceId: validParams.workspaceId,
						title: structure.filename,
						folderPath: [
							DIARY_ROOT_FOLDER,
							structure.yearFolder,
							structure.monthFolder,
							structure.dayFolder,
						],
						type: "diary",
						tags: ["diary"],
						content,
						foldersCollapsed: true,
					}),
					(error): AppError => ({
						type: "DB_ERROR",
						message: `创建文件失败: ${error instanceof Error ? error.message : String(error)}`,
					}),
				),
				TE.map((result) => ({
					node: result.node,
					content,
					parsedContent,
				})),
			),
		),
		// 5. 记录成功日志
		TE.tap((result) => {
			logger.success("[Action] 日记创建成功:", result.node.id);
			return TE.right(result);
		}),
	);
};

/**
 * 创建日记条目（异步版本）
 *
 * 用于在组件中直接调用，返回 Promise。
 *
 * @param params - 创建日记参数
 * @returns Promise<DiaryCreationResult>
 * @throws Error 如果创建失败
 */
export async function createDiaryAsync(
	params: CreateDiaryParams,
): Promise<DiaryCreationResult> {
	const result = await createDiary(params)();

	if (E.isLeft(result)) {
		throw new Error(result.left.message);
	}

	return result.right;
}
