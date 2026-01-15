/**
 * @fileoverview Rule to prohibit throw statements and suggest Either.left/TaskEither.left
 * @author Grain Team
 *
 * Requirements: 1.2
 * - WHEN a developer uses throw statement THEN the ESLint_Plugin SHALL report
 *   an error suggesting Either.left() or TaskEither.left()
 */

import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils"
import { buildComprehensiveErrorMessage } from "../../utils/message-builder.js"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`,
)

/**
 * throw 语句的错误消息
 */
const NO_THROW_MESSAGE = buildComprehensiveErrorMessage({
	architecturePrinciple: `Grain 项目使用 Either/TaskEither 表示可能失败的操作：
  - 同步操作使用 Either<E, A>
  - 异步操作使用 TaskEither<E, A>
  - 错误类型在类型签名中显式声明`,
	correctExample: `import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { AppError } from '@/types/error.types';

// 同步验证 - 使用 Either
const validate = (input: string): E.Either<AppError, string> => {
  if (!input) {
    return E.left({
      type: 'VALIDATION_ERROR',
      message: 'Input is required',
    });
  }
  return E.right(input.trim());
};

// 异步操作 - 使用 TaskEither
const fetchUser = (id: string): TE.TaskEither<AppError, User> => {
  if (!id) {
    return TE.left({
      type: 'VALIDATION_ERROR',
      message: 'User ID is required',
    });
  }
  return TE.tryCatch(
    () => api.getUser(id),
    (error): AppError => ({
      type: 'API_ERROR',
      message: String(error),
    })
  );
};`,
	docRef: "https://gcanti.github.io/fp-ts/modules/Either.ts.html",
	problemCode: `function validate(input: string): string {
  if (!input) {
    throw new Error('Input is required');
  }
  return input.trim();
}`,
	reason: `throw 语句会中断程序流程，导致：
  - 调用者无法从类型签名知道函数可能失败
  - 错误可能在调用栈中任意位置被捕获或遗漏
  - 难以进行函数组合和管道操作`,
	relatedRules: ["no-try-catch", "no-promise-methods", "fp-ts-patterns"],
	steeringFile: "#fp-patterns - Either 同步错误处理",
	steps: [
		"确定操作是同步还是异步",
		"同步操作返回 Either.left(error)",
		"异步操作返回 TaskEither.left(error)",
		"定义明确的错误类型 AppError",
	],
	title: "禁止使用 throw 语句",
	warnings: [
		"不要返回字符串作为错误，必须使用 AppError 类型",
		"确保所有可能的错误路径都返回 left",
		"在管道中使用 E.chain/TE.chain 组合多个可能失败的操作",
	],
})

/**
 * throw new Error 的特定消息
 */
const NO_THROW_ERROR_MESSAGE = buildComprehensiveErrorMessage({
	architecturePrinciple: `在函数式编程中，错误是值而不是异常：
  - Error 对象变成 AppError 类型
  - throw 变成 return E.left() 或 return TE.left()
  - 类型系统强制调用者处理错误`,
	correctExample: `// ❌ 错误做法
throw new Error('Something went wrong');

// ✅ 正确做法
return E.left({
  type: 'OPERATION_ERROR',
  message: 'Something went wrong',
  context: { operation: 'processData' },
});`,
	docRef: "https://gcanti.github.io/fp-ts/modules/Either.ts.html#left",
	reason: `throw new Error() 是最常见的异常抛出模式，应该替换为 Either.left 或 TaskEither.left`,
	relatedRules: ["no-try-catch"],
	steeringFile: "#fp-patterns - 错误类型定义",
	steps: [
		"将 throw new Error(message) 替换为 return E.left({ type, message })",
		"定义具体的错误类型而不是通用 Error",
	],
	title: "禁止使用 throw new Error()",
})

export default createRule({
	create(context) {
		return {
			ThrowStatement(node: TSESTree.ThrowStatement) {
				// Check if throwing new Error specifically
				const isThrowingNewError =
					node.argument?.type === "NewExpression" &&
					node.argument.callee.type === "Identifier" &&
					node.argument.callee.name === "Error"

				context.report({
					messageId: isThrowingNewError ? "noThrowError" : "noThrow",
					node,
				})
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "Prohibit throw statements and suggest Either.left/TaskEither.left",
		},
		fixable: undefined,
		messages: {
			noThrow: NO_THROW_MESSAGE,
			noThrowError: NO_THROW_ERROR_MESSAGE,
		},
		schema: [],
		type: "problem",
	},
	name: "no-throw",
})
