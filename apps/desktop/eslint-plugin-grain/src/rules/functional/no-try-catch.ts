/**
 * @fileoverview Rule to prohibit try-catch statements and suggest TaskEither usage
 * @author Grain Team
 *
 * Requirements: 1.1
 * - WHEN a developer uses try-catch statement THEN the ESLint_Plugin SHALL report
 *   an error with TaskEither migration guidance
 */

import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils"
import { buildComprehensiveErrorMessage } from "../../utils/message-builder.js"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`,
)

/**
 * 完整的 TaskEither 迁移指导消息
 */
const TASKEITHER_MIGRATION_MESSAGE = buildComprehensiveErrorMessage({
	architecturePrinciple: `Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
  - 错误是显式的返回值，不是异常
  - 类型系统强制处理所有错误情况
  - 错误可以在管道中优雅传递`,
	correctExample: `import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: \`获取数据失败: \${String(error)}\`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();`,
	docRef: "https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html",
	problemCode: `try {
  const result = await fetchData();
} catch (error) {
  console.error(error);
}`,
	reason: `try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型`,
	relatedRules: ["no-throw", "no-promise-methods", "fp-ts-patterns"],
	steeringFile: "#fp-patterns - TaskEither 异步错误处理",
	steps: [
		"将 try-catch 替换为 TE.tryCatch()",
		"定义明确的错误类型 AppError",
		"使用 pipe() 组合操作",
		"在管道末端使用 TE.fold() 处理结果",
	],
	title: "禁止使用 try-catch 语句",
	warnings: [
		"不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型",
		"记得在管道末端调用 () 执行 TaskEither",
	],
})

/**
 * catch 子句的错误消息
 */
const CATCH_CLAUSE_MESSAGE = buildComprehensiveErrorMessage({
	architecturePrinciple: `在函数式编程中，错误恢复通过组合子实现：
  - TE.orElse: 错误恢复，返回新的 TaskEither
  - TE.orElseW: 错误恢复，允许不同的错误类型
  - TE.alt: 提供备选值`,
	correctExample: `import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

// 错误恢复
pipe(
  fetchFromPrimary(),
  TE.orElse(() => fetchFromBackup()),
  TE.orElse(() => TE.right(defaultValue))
);

// 或使用 alt
pipe(
  fetchFromPrimary(),
  TE.alt(() => fetchFromBackup())
);`,
	docRef: "https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html#orelse",
	reason: `catch 子句是 try-catch 的一部分，应该使用 TaskEither.orElse() 处理错误`,
	relatedRules: ["no-try-catch", "no-throw"],
	steeringFile: "#fp-patterns - 错误恢复模式",
	steps: ["移除 try-catch 结构", "使用 TE.orElse 或 TE.alt 处理错误恢复"],
	title: "禁止使用 catch 子句",
})

export default createRule({
	create(context) {
		return {
			// Note: CatchClause is already reported as part of TryStatement
			// We keep this for cases where catch might be detected separately
			CatchClause(node: TSESTree.CatchClause) {
				// Only report if parent is not a TryStatement (edge case)
				if (node.parent?.type !== "TryStatement") {
					context.report({
						messageId: "noCatch",
						node,
					})
				}
			},
			TryStatement(node: TSESTree.TryStatement) {
				context.report({
					messageId: "noTryCatch",
					node,
				})
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "Prohibit try-catch statements and suggest TaskEither usage",
		},
		fixable: undefined,
		messages: {
			noCatch: CATCH_CLAUSE_MESSAGE,
			noTryCatch: TASKEITHER_MIGRATION_MESSAGE,
		},
		schema: [],
		type: "problem",
	},
	name: "no-try-catch",
})
