/**
 * @fileoverview Rule to prohibit async/await outside of io/ layer
 * @author Grain Team
 *
 * Requirements: 17.1, 17.7
 * - WHEN async/await is used outside of io/ layer THEN the ESLint_Plugin SHALL report an error
 * - WHEN await is used without TE.tryCatch wrapper THEN the ESLint_Plugin SHALL report an error
 */

import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils"
import { getArchitectureLayer, isTestFile } from "../../utils/architecture.js"
import { buildComprehensiveErrorMessage } from "../../utils/message-builder.js"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`,
)

/**
 * async 函数在非 io 层的错误消息
 */
const NO_ASYNC_OUTSIDE_IO_MESSAGE = buildComprehensiveErrorMessage({
	title: "禁止在 io/ 层外使用 async 函数",
	problemCode: `// pipes/transform.pipe.ts
export async function transformData(data: Data): Promise<TransformedData> {
  const result = await someAsyncOperation();
  return transform(result);
}`,
	reason: `async 函数在 io/ 层外违反了架构原则：
  - pipes/ 必须是纯函数，不能有异步操作
  - flows/ 应该使用 TaskEither 组合异步操作
  - hooks/ 应该通过 flows/ 间接访问异步操作`,
	architecturePrinciple: `Grain 项目的异步操作规则：
  - io/ 层：可以使用 async/await，但应包装为 TaskEither
  - flows/ 层：组合 TaskEither，不直接使用 async/await
  - pipes/ 层：纯函数，禁止任何异步操作
  - hooks/ 层：通过 TanStack Query 或 flows/ 访问异步操作`,
	steps: [
		"确定异步操作属于哪个层级",
		"将异步操作移动到 io/ 层",
		"在 io/ 层使用 TE.tryCatch 包装",
		"在 flows/ 层使用 pipe 组合 TaskEither",
	],
	correctExample: `// io/api/data.api.ts
import * as TE from 'fp-ts/TaskEither';
import { AppError } from '@/types/error.types';

export const fetchData = (id: string): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    async () => {
      const response = await fetch(\`/api/data/\${id}\`);
      return response.json();
    },
    (error): AppError => ({
      type: 'API_ERROR',
      message: String(error),
    })
  );

// flows/data/load-data.flow.ts
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import { fetchData } from '@/io/api/data.api';
import { transformData } from '@/pipes/data/transform.pipe';

export const loadData = (id: string) =>
  pipe(
    fetchData(id),
    TE.map(transformData)  // transformData 是纯函数
  );`,
	warnings: [
		"io/ 层的 async 函数也应该包装为 TaskEither",
		"测试文件中可以使用 async/await",
		"flows/ 层应该组合 TaskEither，而不是直接使用 async",
	],
	docRef: "#architecture - 依赖规则",
	steeringFile: "#fp-patterns - 异步操作",
	relatedRules: ["no-promise-methods", "no-try-catch", "layer-dependencies"],
})

/**
 * await 表达式在非 io 层的错误消息
 */
const NO_AWAIT_OUTSIDE_IO_MESSAGE = buildComprehensiveErrorMessage({
	title: "禁止在 io/ 层外使用 await 表达式",
	problemCode: `// flows/save.flow.ts
export const saveData = async (data: Data) => {
  const result = await api.save(data);  // ❌ 不应该在 flows 中使用 await
  return result;
};`,
	reason: `await 表达式在 io/ 层外违反了函数式编程原则：
  - await 隐藏了异步操作的组合性
  - 难以进行错误处理和重试
  - 破坏了 TaskEither 的管道组合`,
	architecturePrinciple: `使用 TaskEither 替代 await：
  - TE.chain: 链接多个异步操作
  - TE.map: 转换异步结果
  - pipe: 组合多个操作`,
	steps: [
		"将 await 调用移动到 io/ 层",
		"在 io/ 层返回 TaskEither",
		"在 flows/ 层使用 pipe 和 TE.chain 组合",
	],
	correctExample: `// flows/save.flow.ts
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import { saveDataApi } from '@/io/api/data.api';
import { validateData } from '@/pipes/data/validate.pipe';

export const saveData = (data: Data) =>
  pipe(
    validateData(data),
    TE.fromEither,
    TE.chain(saveDataApi)
  );`,
	docRef: "#fp-patterns - TaskEither 组合",
	steeringFile: "#architecture - 层级职责",
	relatedRules: ["no-async-outside-io", "no-promise-methods"],
})

/**
 * 允许 async/await 的层级
 */
const ALLOWED_ASYNC_LAYERS = ["io", "queries"] as const

export default createRule({
	name: "no-async-outside-io",
	meta: {
		type: "problem",
		docs: {
			description: "Prohibit async/await outside of io/ layer",
		},
		fixable: undefined,
		schema: [],
		messages: {
			noAsyncOutsideIo: NO_ASYNC_OUTSIDE_IO_MESSAGE,
			noAwaitOutsideIo: NO_AWAIT_OUTSIDE_IO_MESSAGE,
		},
	},
	defaultOptions: [],
	create(context) {
		const filename = context.filename || context.getFilename()

		// Skip test files
		if (isTestFile(filename)) {
			return {}
		}

		const currentLayer = getArchitectureLayer(filename)

		// If not in a known layer or in allowed layers, skip
		if (
			!currentLayer ||
			ALLOWED_ASYNC_LAYERS.includes(currentLayer as (typeof ALLOWED_ASYNC_LAYERS)[number])
		) {
			return {}
		}

		return {
			// Detect async function declarations
			FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
				if (node.async) {
					context.report({
						node,
						messageId: "noAsyncOutsideIo",
					})
				}
			},

			// Detect async function expressions
			FunctionExpression(node: TSESTree.FunctionExpression) {
				if (node.async) {
					context.report({
						node,
						messageId: "noAsyncOutsideIo",
					})
				}
			},

			// Detect async arrow functions
			ArrowFunctionExpression(node: TSESTree.ArrowFunctionExpression) {
				if (node.async) {
					context.report({
						node,
						messageId: "noAsyncOutsideIo",
					})
				}
			},

			// Detect await expressions
			AwaitExpression(node: TSESTree.AwaitExpression) {
				context.report({
					node,
					messageId: "noAwaitOutsideIo",
				})
			},
		}
	},
})
