/**
 * @fileoverview Rule to prohibit default exports
 * @author Grain Team
 */

import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils"
import { buildErrorMessage } from "../../utils/message-builder.js"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`,
)

export default createRule({
	create(context) {
		return {
			ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
				context.report({
					messageId: "noDefaultExport",
					node,
				})
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "禁止使用 default export，强制使用 named export",
		},
		fixable: undefined,
		messages: {
			noDefaultExport: buildErrorMessage({
				correctExample: `// ✅ 使用 named export
export const MyComponent = () => { /* ... */ };
export const myFunction = () => { /* ... */ };
export const MY_CONSTANT = 'value';

// 导入时
import { MyComponent, myFunction } from './module';`,
				docRef: "#code-standards - 导出规范",
				incorrectExample: `// ❌ 不要使用 default export
export default MyComponent;
export default function myFunction() { /* ... */ }
export default 'value';`,
				reason: `
  default export 存在以下问题：
  - 导入时可以使用任意名称，降低代码可读性
  - IDE 重构支持较差
  - 难以追踪导出项的使用情况
  - 不利于 tree-shaking`,
				title: "禁止使用 default export",
			}),
		},
		schema: [],
		type: "problem",
	},
	name: "no-default-export",
})
