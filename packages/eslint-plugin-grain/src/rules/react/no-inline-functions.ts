import { ESLintUtils } from "@typescript-eslint/utils"
import { buildErrorMessage } from "../../utils/message-builder"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`,
)

export default createRule({
	create(context) {
		return {
			JSXAttribute(node) {
				// 检查 JSX 属性值
				if (!node.value) return

				// 检查是否为 JSXExpressionContainer
				if (node.value.type !== "JSXExpressionContainer") return

				const expression = node.value.expression

				// 检查是否为箭头函数表达式
				if (expression.type === "ArrowFunctionExpression") {
					context.report({
						messageId: "noInlineArrowFunction",
						node: expression,
					})
					return
				}

				// 检查是否为函数表达式
				if (expression.type === "FunctionExpression") {
					context.report({
						messageId: "noInlineFunction",
						node: expression,
					})
					return
				}
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "禁止在 JSX props 中使用内联函数",
		},
		messages: {
			noInlineArrowFunction: buildErrorMessage({
				correctExample: `// ✅ 使用 useCallback 包裹
const handleChange = useCallback((value: string) => {
  setValue(value);
}, []);

<Input onChange={handleChange} />`,
				docRef: "#fp-patterns - React Hooks 最佳实践",
				incorrectExample: `// ❌ 内联箭头函数
<Input onChange={(value) => setValue(value)} />`,
				reason: `
  内联箭头函数在每次渲染时都会创建新的函数实例，
  导致接收该 prop 的子组件无法通过 memo 优化避免重新渲染。`,
				title: "禁止在 JSX props 中使用内联箭头函数",
			}),
			noInlineFunction: buildErrorMessage({
				correctExample: `// ✅ 使用 useCallback
const handleClick = useCallback(() => {
  doSomething();
}, []);

<Button onClick={handleClick} />`,
				docRef: "#code-standards - React 性能优化",
				incorrectExample: `// ❌ 内联函数
<Button onClick={() => doSomething()} />

// ❌ 内联箭头函数
<Button onClick={(e) => handleEvent(e)} />`,
				reason: `
  内联函数会导致性能问题：
  - 每次渲染都创建新函数引用
  - 破坏子组件的 memo 优化
  - 导致不必要的重新渲染`,
				title: "禁止在 JSX props 中使用内联函数",
			}),
		},
		schema: [],
		type: "problem",
	},
	name: "no-inline-functions",
})
