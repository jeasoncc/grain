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
import {
	generateDiaryContent,
	getDiaryFolderStructure,
} from "@/domain/diary/diary.utils";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";
import type { NodeInterface } from "@/types/node";
import { createFileInTree } from "./create-node.action";

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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly parsedContent: any;
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

	const date = params.date || new Date();
	const structure = getDiaryFolderStructure(date);

	// 生成日记内容
	const content = generateDiaryContent(date);
	let parsedContent: unknown;

	try {
		parsedContent = JSON.parse(content);
	} catch (error) {
		logger.error("[Action] 日记内容解析失败:", error);
		return TE.left({
			type: "VALIDATION_ERROR",
			message: "日记内容生成失败",
		});
	}

	// 使用 createFileInTree 创建日记文件
	return TE.tryCatch(
		async () => {
			const result = await createFileInTree({
				workspaceId: params.workspaceId,
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
			});

			logger.success("[Action] 日记创建成功:", result.node.id);

			return {
				node: result.node,
				content,
				parsedContent,
			};
		},
		(error): AppError => {
			logger.error("[Action] 日记创建失败:", error);
			return {
				type: "DB_ERROR",
				message: `日记创建失败: ${error instanceof Error ? error.message : String(error)}`,
			};
		},
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
