import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils"
import { buildErrorMessage } from "../../utils/message-builder"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`,
)

export default createRule({
	create(context) {
		// 跟踪当前组件中定义的函数
		const functionDeclarations = new Map<string, TSESTree.Node>()
		// 跟踪使用 useCallback 包裹的函数
		const callbackFunctions = new Set<string>()

		return {
			// 收集所有函数声明
			FunctionDeclaration(node) {
				if (node.id) {
					functionDeclarations.set(node.id.name, node)
				}
			},

			// 检查 JSX 属性中使用的函数
			"JSXAttribute > JSXExpressionContainer > Identifier"(node: TSESTree.Identifier) {
				const functionName = node.name

				// 如果这个标识符引用了一个函数声明
				if (functionDeclarations.has(functionName)) {
					// 检查是否被 useCallback 包裹
					if (!callbackFunctions.has(functionName)) {
						const functionNode = functionDeclarations.get(functionName)
						if (functionNode) {
							context.report({
								messageId: "requireCallback",
								node: functionNode,
							})
						}
					}
				}
			},

			// 收集所有变量声明中的函数
			VariableDeclarator(node) {
				if (node.id.type !== "Identifier") return

				// 检查 useCallback 调用
				if (
					node.init?.type === "CallExpression" &&
					node.init.callee.type === "Identifier" &&
					node.init.callee.name === "useCallback"
				) {
					callbackFunctions.add(node.id.name)
					return
				}

				// 检查普通函数声明
				if (
					node.init?.type === "ArrowFunctionExpression" ||
					node.init?.type === "FunctionExpression"
				) {
					const parent = node.parent
					if (parent?.type === "VariableDeclaration" && parent.parent?.type === "Program") {
						functionDeclarations.set(node.id.name, node)
					}
				}
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "检测函数 props 是否使用 useCallback",
		},
		messages: {
			requireCallback: buildErrorMessage({
				correctExample: `// ✅ 使用 useCallback
const handleClick = useCallback(() => {
  doSomething();
}, []);

<Button onClick={handleClick} />

// ✅ 使用 useCallback 带依赖
const handleSubmit = useCallback((data: FormData) => {
  submitForm(data, userId);
}, [userId]);

<Form onSubmit={handleSubmit} />`,
				docRef: "#fp-patterns - React Hooks 最佳实践",
				incorrectExample: `// ❌ 直接定义函数
const handleClick = () => {
  doSomething();
};

<Button onClick={handleClick} />

// ❌ 函数表达式
function handleClick() {
  doSomething();
}

<Button onClick={handleClick} />`,
				reason: `
  未使用 useCallback 的函数 prop 会导致：
  - 每次渲染创建新的函数引用
  - 子组件的 memo 优化失效
  - 不必要的重新渲染`,
				title: "函数 prop 必须使用 useCallback 包裹",
			}),
		},
		schema: [],
		type: "problem",
	},
	name: "require-callback",
})
