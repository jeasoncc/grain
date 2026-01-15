/**
 * @file create-date-template.flow.ts
 * @description 日期模板创建 Flow 工厂
 *
 * 功能说明：
 * - 提供通用的日期模板 action 创建工厂
 * - 消除 diary/wiki/todo/note/ledger action 文件中的重复代码
 * - 所有日期模板共用相同的参数结构和创建逻辑
 *
 * 设计理念：
 * - 高阶函数：接收配置，返回具体的创建函数
 * - 函数复用：一个工厂函数生成所有日期模板的 action
 * - 类型安全：泛型支持不同类型的参数
 *
 * @requirements 代码复用，函数式编程规范
 */

import type { DateTemplateParams } from "./configs/date-template.factory"
import type { TemplateConfig } from "./create-templated-file.flow"
import { createTemplatedFile, createTemplatedFileAsync } from "./create-templated-file.flow"

// ==============================
// Types
// ==============================

/**
 * 日期模板创建参数（所有日期模板共用）
 */
export interface CreateDateTemplateParams {
	/** 工作区 ID */
	readonly workspaceId: string
	/** 日期（可选，默认为当前时间） */
	readonly date?: Date
}

/**
 * 日期模板创建结果（所有日期模板共用）
 */
export interface DateTemplateCreationResult {
	/** 创建的节点 */
	readonly node: import("@/types/node").NodeInterface
	/** 生成的内容（Lexical JSON 字符串） */
	readonly content: string
	/** 解析后的内容（Lexical JSON 对象） */
	readonly parsedContent: unknown
}

// ==============================
// Factory Functions
// ==============================

/**
 * 将通用参数转换为模板化文件参数
 */
const adaptParams = (params: CreateDateTemplateParams) => ({
	templateParams: {
		date: params.date,
	},
	workspaceId: params.workspaceId,
})

/**
 * 创建日期模板 Flow 的工厂函数
 *
 * 消除所有日期模板 action 文件中的重复代码。
 * 返回一个对象，包含所有需要的函数。
 *
 * @param config - 模板配置
 * @returns 包含 create、createAsync、createCompat、createCompatAsync 的对象
 *
 * @example
 * ```typescript
 * import { diaryConfig } from "./configs/diary.config";
 *
 * const diaryActions = createDateTemplateActions(diaryConfig);
 * export const createDiary = diaryActions.create;
 * export const createDiaryAsync = diaryActions.createAsync;
 * export const createDiaryCompatAsync = diaryActions.createCompatAsync;
 * ```
 */
export const createDateTemplateActions = (config: TemplateConfig<DateTemplateParams>) => {
	const create = createTemplatedFile(config)
	const createAsync = createTemplatedFileAsync(config)

	return {
		/** TaskEither 版本 */
		create,
		/** Promise 版本 */
		createAsync,
		/** 兼容旧 API 的 TaskEither 版本 */
		createCompat: (params: CreateDateTemplateParams) => create(adaptParams(params)),
		/** 兼容旧 API 的 Promise 版本 */
		createCompatAsync: async (
			params: CreateDateTemplateParams,
		): Promise<DateTemplateCreationResult> => createAsync(adaptParams(params)),
	}
}

// ==============================
// Pre-built Actions
// ==============================

// 导入所有配置
import { diaryConfig } from "./configs/diary.config"
import { ledgerConfig } from "./configs/ledger.config"
import { noteConfig } from "./configs/note.config"
import { todoConfig } from "./configs/todo.config"
import { wikiConfig } from "./configs/wiki.config"

/** Diary actions */
export const diaryActions = createDateTemplateActions(diaryConfig)

/** Wiki actions */
export const wikiActions = createDateTemplateActions(wikiConfig)

/** Todo actions */
export const todoActions = createDateTemplateActions(todoConfig)

/** Note actions */
export const noteActions = createDateTemplateActions(noteConfig)

/** Ledger actions */
export const ledgerActions = createDateTemplateActions(ledgerConfig)

// ==============================
// Convenience Exports
// ==============================

// Diary
export const createDiary = diaryActions.create
export const createDiaryAsync = diaryActions.createAsync
export const createDiaryCompat = diaryActions.createCompat
export const createDiaryCompatAsync = diaryActions.createCompatAsync

// Wiki
export const createWiki = wikiActions.create
export const createWikiAsync = wikiActions.createAsync
export const createWikiCompat = wikiActions.createCompat
export const createWikiCompatAsync = wikiActions.createCompatAsync

// Todo
export const createTodo = todoActions.create
export const createTodoAsync = todoActions.createAsync
export const createTodoCompat = todoActions.createCompat
export const createTodoCompatAsync = todoActions.createCompatAsync

// Note
export const createNote = noteActions.create
export const createNoteAsync = noteActions.createAsync
export const createNoteCompat = noteActions.createCompat
export const createNoteCompatAsync = noteActions.createCompatAsync

// Ledger
export const createLedger = ledgerActions.create
export const createLedgerAsync = ledgerActions.createAsync
export const createLedgerCompat = ledgerActions.createCompat
export const createLedgerCompatAsync = ledgerActions.createCompatAsync
