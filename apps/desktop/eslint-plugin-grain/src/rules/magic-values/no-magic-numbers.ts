import type { TSESTree } from "@typescript-eslint/utils"
import { ESLintUtils } from "@typescript-eslint/utils"
import { buildErrorMessage } from "../../utils/message-builder"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`,
)

type MessageIds = "noMagicNumber"
type Options = []

/**
 * 禁止魔法数字规则
 * 检测未命名的数字字面量（除了 0, 1, -1）
 *
 * Validates: Requirements 23.1
 */
export default createRule<Options, MessageIds>({
	name: "no-magic-numbers",
	meta: {
		type: "problem",
		docs: {
			description: "禁止使用魔法数字，必须使用命名常量",
		},
		messages: {
			noMagicNumber: buildErrorMessage({
				title: "禁止使用魔法数字 {{value}}",
				reason: `
  魔法数字降低代码可读性和可维护性：
  - 数字的含义不明确
  - 修改时需要查找所有出现的地方
  - 容易出现拼写错误
  - 难以理解业务逻辑`,
				correctExample: `// ✅ 使用命名常量
const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT_MS = 5000;
const ITEMS_PER_PAGE = 20;

function retry(fn: () => void) {
  for (let i = 0; i < MAX_RETRY_COUNT; i++) {
    fn();
  }
}

setTimeout(callback, DEFAULT_TIMEOUT_MS);`,
				incorrectExample: `// ❌ 使用魔法数字
function retry(fn: () => void) {
  for (let i = 0; i < 3; i++) {  // 3 是什么意思？
    fn();
  }
}

setTimeout(callback, 5000);  // 5000 是什么意思？`,
				docRef: "#code-standards - 魔法值",
			}),
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		/**
		 * 检查数字是否为允许的值
		 */
		function isAllowedNumber(value: number): boolean {
			// 允许 0, 1, -1
			return value === 0 || value === 1 || value === -1
		}

		/**
		 * 检查节点是否在常量声明中
		 */
		function isInConstantDeclaration(node: TSESTree.Literal): boolean {
			const parent = node.parent
			if (!parent) return false

			// 检查是否在 VariableDeclarator 的初始化中
			if (
				parent.type === "VariableDeclarator" &&
				parent.init === node &&
				parent.id.type === "Identifier"
			) {
				const varName = parent.id.name
				// 检查是否为 SCREAMING_SNAKE_CASE
				return /^[A-Z][A-Z0-9_]*$/.test(varName)
			}

			return false
		}

		return {
			Literal(node: TSESTree.Literal) {
				// 只检查数字字面量
				if (typeof node.value !== "number") {
					return
				}

				const value = node.value
				const parent = node.parent

				// 允许的数字
				if (isAllowedNumber(value)) {
					return
				}

				// 允许在常量声明中
				if (isInConstantDeclaration(node)) {
					return
				}

				// 允许在数组索引中使用
				if (parent && parent.type === "MemberExpression" && parent.property === node) {
					return
				}

				// 允许在枚举中使用
				if (parent && parent.type === "TSEnumMember") {
					return
				}

				// 允许在类型注解中使用
				if (parent && (parent.type === "TSLiteralType" || parent.type === "TSTypeAnnotation")) {
					return
				}

				// 允许在 readonly 属性中使用
				if (
					parent &&
					parent.type === "PropertyDefinition" &&
					parent.readonly &&
					parent.value === node
				) {
					return
				}

				// 报告错误
				context.report({
					node,
					messageId: "noMagicNumber",
					data: {
						value: String(value),
					},
				})
			},
		}
	},
})
