/**
 * @fileoverview Rule to enforce correct fp-ts patterns
 * @author Grain Team
 *
 * Requirements: 26.1-26.7
 * - WHEN Either/Option is not properly folded THEN the ESLint_Plugin SHALL report an error
 * - WHEN TaskEither is not executed with () THEN the ESLint_Plugin SHALL report an error
 * - WHEN manual null/undefined check is used instead of Option THEN the ESLint_Plugin SHALL report an error
 * - WHEN pipe() has more than 10 functions THEN the ESLint_Plugin SHALL report a warning
 */

import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils"
import { buildComprehensiveErrorMessage, buildWarningMessage } from "../../utils/message-builder.js"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`,
)

/**
 * 未 fold 的 Either/Option 错误消息
 */
const UNFOLDED_EITHER_OPTION_MESSAGE = buildComprehensiveErrorMessage({
	title: "检测到未处理的 Either/Option",
	problemCode: `const result = pipe(
  fetchData(),
  E.map(transform)
);
// result 是 Either，但没有被 fold 处理`,
	reason: `Either/Option 必须被显式处理：
  - 未处理的 Either 可能包含错误
  - 未处理的 Option 可能是 None
  - 类型系统无法强制运行时处理`,
	architecturePrinciple: `fp-ts 的容器类型必须被"打开"：
  - Either: 使用 E.fold, E.match, E.getOrElse
  - Option: 使用 O.fold, O.match, O.getOrElse
  - TaskEither: 使用 TE.fold, TE.match 后执行`,
	steps: [
		"确定 Either/Option 的最终用途",
		"使用 fold/match 处理两种情况",
		"或使用 getOrElse 提供默认值",
	],
	correctExample: `import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';

// Either - 使用 fold
const result = pipe(
  fetchData(),
  E.map(transform),
  E.fold(
    (error) => handleError(error),
    (data) => handleSuccess(data)
  )
);

// Option - 使用 getOrElse
const value = pipe(
  O.fromNullable(maybeValue),
  O.map(transform),
  O.getOrElse(() => defaultValue)
);

// Option - 使用 match
const message = pipe(
  O.fromNullable(user),
  O.match(
    () => 'Guest',
    (u) => u.name
  )
);`,
	docRef: "https://gcanti.github.io/fp-ts/modules/Either.ts.html#fold",
	steeringFile: "#fp-patterns - Either/Option 处理",
	relatedRules: ["no-try-catch", "no-throw"],
})

/**
 * 未执行的 TaskEither 错误消息
 */
const UNEXECUTED_TASKEITHER_MESSAGE = buildComprehensiveErrorMessage({
	title: "TaskEither 未被执行",
	problemCode: `const task = pipe(
  fetchData(),
  TE.map(transform),
  TE.fold(handleError, handleSuccess)
);
// task 是 Task，但没有被执行 ()`,
	reason: `TaskEither/Task 是惰性的，必须显式执行：
  - TaskEither 是一个返回 Promise 的函数
  - 不调用 () 则不会执行任何操作
  - 这是常见的 fp-ts 错误`,
	architecturePrinciple: `TaskEither 的执行模式：
  - 构建管道时不执行任何操作
  - 调用 () 时才开始执行
  - 通常在 hooks 或入口点执行`,
	steps: [
		"确认 TaskEither 管道已完成（通常以 fold 结尾）",
		"在管道末尾调用 () 执行",
		"或将 Task 传递给执行器",
	],
	correctExample: `import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';

// 正确执行 TaskEither
pipe(
  fetchData(),
  TE.map(transform),
  TE.fold(
    (error) => T.of(handleError(error)),
    (data) => T.of(handleSuccess(data))
  )
)();  // 注意这里的 ()

// 在 React 中使用
useEffect(() => {
  pipe(
    loadUserData(userId),
    TE.fold(
      (error) => T.of(setError(error)),
      (data) => T.of(setData(data))
    )
  )();
}, [userId]);

// 或使用 TanStack Query
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => pipe(
    loadUserData(userId),
    TE.getOrElse(() => T.of(null))
  )(),
});`,
	warnings: ["确保 fold 返回的是 Task<void> 或 Task<A>", "不要忘记最后的 () 调用"],
	docRef: "https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html",
	steeringFile: "#fp-patterns - TaskEither 执行",
	relatedRules: ["no-promise-methods", "fp-ts-patterns"],
})

/**
 * 手动 null 检查的错误消息
 */
const MANUAL_NULL_CHECK_MESSAGE = buildComprehensiveErrorMessage({
	title: "使用 Option 替代手动 null/undefined 检查",
	problemCode: `if (value !== null && value !== undefined) {
  return transform(value);
} else {
  return defaultValue;
}`,
	reason: `手动 null 检查容易出错：
  - 可能遗漏 undefined 或 null
  - 嵌套检查难以阅读
  - 不如 Option 类型安全`,
	architecturePrinciple: `使用 Option 处理可空值：
  - O.fromNullable: 将可空值转为 Option
  - O.map: 安全地转换值
  - O.getOrElse: 提供默认值`,
	steps: [
		"使用 O.fromNullable 包装可空值",
		"使用 O.map/O.chain 进行转换",
		"使用 O.getOrElse 或 O.fold 提取值",
	],
	correctExample: `import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';

// ❌ 错误做法
if (value !== null && value !== undefined) {
  return transform(value);
} else {
  return defaultValue;
}

// ✅ 正确做法
const result = pipe(
  O.fromNullable(value),
  O.map(transform),
  O.getOrElse(() => defaultValue)
);

// ✅ 嵌套可空值
const city = pipe(
  O.fromNullable(user),
  O.chain(u => O.fromNullable(u.address)),
  O.chain(a => O.fromNullable(a.city)),
  O.getOrElse(() => 'Unknown')
);

// ✅ 使用 optional chaining 配合 Option
const city = pipe(
  O.fromNullable(user?.address?.city),
  O.getOrElse(() => 'Unknown')
);`,
	docRef: "https://gcanti.github.io/fp-ts/modules/Option.ts.html",
	steeringFile: "#fp-patterns - Option 处理",
	relatedRules: ["fp-ts-patterns"],
})

/**
 * pipe 函数过长的警告消息
 */
const PIPE_TOO_LONG_MESSAGE = buildWarningMessage({
	title: "pipe() 包含过多函数",
	suggestion: `pipe 超过 10 个函数时应该提取为独立函数：
  - 提高可读性
  - 便于测试
  - 便于复用`,
	example: `// ❌ 过长的 pipe
const result = pipe(
  data,
  step1,
  step2,
  step3,
  step4,
  step5,
  step6,
  step7,
  step8,
  step9,
  step10,
  step11,
);

// ✅ 提取为独立函数
const prepareData = flow(step1, step2, step3, step4);
const transformData = flow(step5, step6, step7);
const finalizeData = flow(step8, step9, step10, step11);

const result = pipe(
  data,
  prepareData,
  transformData,
  finalizeData
);`,
})

/**
 * if-else 替代 Either.match 的警告消息
 */
const USE_EITHER_MATCH_MESSAGE = buildComprehensiveErrorMessage({
	title: "使用 Either.match 替代 if-else",
	problemCode: `if (E.isRight(result)) {
  return handleSuccess(result.right);
} else {
  return handleError(result.left);
}`,
	reason: `手动检查 Either 不如 match/fold 安全：
  - 可能遗漏某个分支
  - 类型推断不如 match 精确
  - 代码更冗长`,
	architecturePrinciple: `使用 Either 的模式匹配：
  - E.match/E.fold: 处理两种情况
  - 类型安全，编译器强制处理两种情况`,
	steps: ["将 if-else 替换为 E.match 或 E.fold", "确保两个分支返回相同类型"],
	correctExample: `import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';

// ❌ 错误做法
if (E.isRight(result)) {
  return handleSuccess(result.right);
} else {
  return handleError(result.left);
}

// ✅ 正确做法
const output = pipe(
  result,
  E.match(handleError, handleSuccess)
);

// ✅ 或使用 fold
const output = pipe(
  result,
  E.fold(handleError, handleSuccess)
);`,
	docRef: "https://gcanti.github.io/fp-ts/modules/Either.ts.html#match",
	steeringFile: "#fp-patterns - Either 模式匹配",
	relatedRules: ["fp-ts-patterns"],
})

export default createRule({
	name: "fp-ts-patterns",
	meta: {
		type: "problem",
		docs: {
			description: "Enforce correct fp-ts patterns",
		},
		fixable: undefined,
		schema: [],
		messages: {
			unfoldedEitherOption: UNFOLDED_EITHER_OPTION_MESSAGE,
			unexecutedTaskEither: UNEXECUTED_TASKEITHER_MESSAGE,
			manualNullCheck: MANUAL_NULL_CHECK_MESSAGE,
			pipeTooLong: PIPE_TOO_LONG_MESSAGE,
			useEitherMatch: USE_EITHER_MATCH_MESSAGE,
		},
	},
	defaultOptions: [],
	create(context) {
		const MAX_PIPE_LENGTH = 10

		return {
			// Detect pipe() with too many arguments
			CallExpression(node: TSESTree.CallExpression) {
				// Check for pipe() calls
				if (node.callee.type === "Identifier" && node.callee.name === "pipe") {
					// pipe(value, fn1, fn2, ...) - first arg is value, rest are functions
					const functionCount = node.arguments.length - 1
					if (functionCount > MAX_PIPE_LENGTH) {
						context.report({
							node,
							messageId: "pipeTooLong",
						})
					}
				}

				// Check for E.isRight/E.isLeft usage (suggests using match instead)
				if (
					node.callee.type === "MemberExpression" &&
					node.callee.object.type === "Identifier" &&
					(node.callee.object.name === "E" || node.callee.object.name === "Either") &&
					node.callee.property.type === "Identifier" &&
					(node.callee.property.name === "isRight" || node.callee.property.name === "isLeft")
				) {
					// Check if this is inside an if statement condition
					let parent: TSESTree.Node | undefined = node.parent
					while (parent) {
						if (parent.type === "IfStatement" && parent.test === node) {
							context.report({
								node: parent,
								messageId: "useEitherMatch",
							})
							break
						}
						if (
							parent.type === "IfStatement" &&
							parent.test.type === "CallExpression" &&
							parent.test === node
						) {
							context.report({
								node: parent,
								messageId: "useEitherMatch",
							})
							break
						}
						parent = parent.parent
					}
				}
			},

			// Detect manual null/undefined checks
			IfStatement(node: TSESTree.IfStatement) {
				const test = node.test

				// Check for patterns like: value !== null, value !== undefined, value != null
				if (test.type === "BinaryExpression") {
					const isNullCheck =
						(test.operator === "!==" || test.operator === "!=") &&
						((test.right.type === "Literal" && test.right.value === null) ||
							(test.right.type === "Identifier" && test.right.name === "undefined"))

					if (isNullCheck) {
						context.report({
							node,
							messageId: "manualNullCheck",
						})
					}
				}

				// Check for patterns like: value !== null && value !== undefined
				if (test.type === "LogicalExpression" && test.operator === "&&") {
					const left = test.left
					const right = test.right

					const isDoubleNullCheck =
						left.type === "BinaryExpression" &&
						right.type === "BinaryExpression" &&
						(left.operator === "!==" || left.operator === "!=") &&
						(right.operator === "!==" || right.operator === "!=")

					if (isDoubleNullCheck) {
						const leftIsNullCheck =
							(left.right.type === "Literal" && left.right.value === null) ||
							(left.right.type === "Identifier" && left.right.name === "undefined")
						const rightIsNullCheck =
							(right.right.type === "Literal" && right.right.value === null) ||
							(right.right.type === "Identifier" && right.right.name === "undefined")

						if (leftIsNullCheck && rightIsNullCheck) {
							context.report({
								node,
								messageId: "manualNullCheck",
							})
						}
					}
				}
			},
		}
	},
})
