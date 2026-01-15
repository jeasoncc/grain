import { ESLintUtils } from "@typescript-eslint/utils"
import { buildErrorMessage } from "../../utils/message-builder"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`,
)

export default createRule({
	create(context) {
		return {
			ConditionalExpression(node) {
				// 检查 consequent 或 alternate 是否包含嵌套的三元表达式
				const hasNestedInConsequent = node.consequent.type === "ConditionalExpression"
				const hasNestedInAlternate = node.alternate.type === "ConditionalExpression"

				if (hasNestedInConsequent || hasNestedInAlternate) {
					context.report({
						messageId: "noNestedTernary",
						node,
					})
				}
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "禁止嵌套三元表达式",
		},
		messages: {
			noNestedTernary: buildErrorMessage({
				correctExample: `// ✅ 使用 if-else 或提取函数
const getStatus = (score: number): string => {
  if (score >= 90) return 'excellent';
  if (score >= 60) return 'pass';
  return 'fail';
};

// 或使用查找表
const STATUS_MAP: Record<string, string> = {
  high: 'excellent',
  medium: 'pass',
  low: 'fail',
};
const status = STATUS_MAP[level];

// 或使用 pipe + match
pipe(
  score,
  O.fromPredicate(s => s >= 90),
  O.match(
    () => score >= 60 ? 'pass' : 'fail',
    () => 'excellent'
  )
);`,
				docRef: "#code-standards - 条件语句规范",
				incorrectExample: `// ❌ 嵌套三元表达式
const status = score >= 90 
  ? 'excellent' 
  : score >= 60 
    ? 'pass' 
    : 'fail';`,
				reason: `
  嵌套三元表达式会严重降低代码可读性：
  - 难以理解条件逻辑的执行路径
  - 容易出错且难以调试
  - 违反"代码应该易于阅读"的原则`,
				title: "禁止嵌套三元表达式",
			}),
		},
		schema: [],
		type: "problem",
	},
	name: "no-nested-ternary",
})
