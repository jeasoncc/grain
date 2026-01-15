import type { TSESTree } from "@typescript-eslint/utils"
import { ESLintUtils } from "@typescript-eslint/utils"
import { DEFAULT_COMPLEXITY_CONFIG } from "../../types/config.types"
import { buildErrorMessage } from "../../utils/message-builder"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`,
)

type MessageIds = "maxFileLines"
type Options = [{ max?: number; skipBlankLines?: boolean; skipComments?: boolean }]

export default createRule<Options, MessageIds>({
	name: "max-file-lines",
	meta: {
		type: "problem",
		docs: {
			description: "限制文件最大行数",
		},
		messages: {
			maxFileLines: buildErrorMessage({
				title: "文件超过 {{max}} 行（当前 {{actual}} 行）",
				reason: `过长的文件难以维护：
  - 职责不清晰
  - 难以导航和查找
  - 增加认知负担
  - 违反单一职责原则`,
				correctExample: `// ✅ 拆分为多个文件
// node-tree.pipe.ts (50 行)
export const buildTree = ...

// node-transform.pipe.ts (60 行)
export const transformNode = ...

// node-validate.pipe.ts (40 行)
export const validateNode = ...

// index.ts (10 行)
export * from './node-tree.pipe';
export * from './node-transform.pipe';
export * from './node-validate.pipe';`,
				incorrectExample: `// ❌ 单个文件过长
// node.pipe.ts (300+ 行)
// 包含树构建、转换、验证等多个职责`,
				docRef: "#code-standards - 复杂度限制",
			}),
		},
		schema: [
			{
				type: "object",
				properties: {
					max: {
						type: "number",
						minimum: 1,
					},
					skipBlankLines: {
						type: "boolean",
					},
					skipComments: {
						type: "boolean",
					},
				},
				additionalProperties: false,
			},
		],
	},
	defaultOptions: [
		{
			max: DEFAULT_COMPLEXITY_CONFIG.maxFileLines,
			skipBlankLines: false,
			skipComments: false,
		},
	],
	create(context, [options]) {
		const maxLines = options.max ?? DEFAULT_COMPLEXITY_CONFIG.maxFileLines
		const skipBlankLines = options.skipBlankLines ?? false
		const skipComments = options.skipComments ?? false

		return {
			Program(node: TSESTree.Program) {
				const sourceCode = context.sourceCode
				const lines = sourceCode.lines
				let actualLines = lines.length

				if (skipBlankLines || skipComments) {
					const comments = sourceCode.getAllComments()
					const commentLines = new Set<number>()

					if (skipComments) {
						comments.forEach((comment) => {
							for (let i = comment.loc.start.line; i <= comment.loc.end.line; i++) {
								commentLines.add(i)
							}
						})
					}

					actualLines = lines.filter((line, index) => {
						const lineNumber = index + 1

						// 跳过注释行
						if (skipComments && commentLines.has(lineNumber)) {
							return false
						}

						// 跳过空白行
						if (skipBlankLines && line.trim() === "") {
							return false
						}

						return true
					}).length
				}

				if (actualLines > maxLines) {
					context.report({
						node,
						messageId: "maxFileLines",
						data: {
							max: String(maxLines),
							actual: String(actualLines),
						},
					})
				}
			},
		}
	},
})
