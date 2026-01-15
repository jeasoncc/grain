import { ESLintUtils } from "@typescript-eslint/utils"
import { buildErrorMessage } from "../../utils/message-builder"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`,
)

export default createRule({
	create(context) {
		return {
			BinaryExpression(node) {
				if (node.operator === "==" || node.operator === "!=") {
					context.report({
						fix(fixer) {
							// 自动修复：== → ===, != → !==
							const operator = node.operator === "==" ? "===" : "!=="
							const sourceCode = context.sourceCode
							const operatorToken = sourceCode
								.getTokensBetween(node.left, node.right)
								.find((token) => token.value === node.operator)

							if (operatorToken) {
								return fixer.replaceText(operatorToken, operator)
							}
							return null
						},
						messageId: "useStrictEquality",
						node,
					})
				}
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "强制使用 === 和 !==",
		},
		fixable: "code",
		messages: {
			useStrictEquality: buildErrorMessage({
				correctExample: `// ✅ 使用严格相等
if (value === 0) { }
if (value !== null) { }
if (status === 'active') { }

// 对于 null/undefined 检查，使用 Option
import * as O from 'fp-ts/Option';
const maybeValue = O.fromNullable(value);`,
				docRef: "#code-standards - 类型安全",
				incorrectExample: `// ❌ 使用非严格相等
if (value == 0) { }
if (value != null) { }
if (status == 'active') { }`,
				reason: `
  使用 == 和 != 会进行类型强制转换，导致：
  - 不可预测的比较结果
  - 难以发现的 bug
  - 违反类型安全原则
  
  常见陷阱：
  - '' == 0 → true
  - '0' == 0 → true
  - false == '0' → true
  - null == undefined → true`,
				title: "必须使用严格相等运算符 === 和 !==",
			}),
		},
		schema: [],
		type: "problem",
	},
	name: "strict-equality",
})
