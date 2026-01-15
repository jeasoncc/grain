import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils"
import { buildErrorMessage } from "../../utils/message-builder"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`,
)

export default createRule({
	name: "hooks-patterns",
	meta: {
		type: "problem",
		docs: {
			description: "检测 React Hooks 使用模式",
		},
		messages: {
			missingDependency: buildErrorMessage({
				title: "useEffect 缺少依赖项",
				reason: `
  useEffect 的依赖数组必须包含所有在 effect 中使用的外部变量。
  缺少依赖会导致：
  - 使用过期的闭包值
  - 难以追踪的 bug
  - 违反 React Hooks 规则`,
				correctExample: `// ✅ 包含所有依赖
useEffect(() => {
  fetchData(userId);
}, [userId]);

// ✅ 空依赖数组需要注释说明
useEffect(() => {
  // 仅在组件挂载时执行一次
  initializeApp();
}, []);`,
				incorrectExample: `// ❌ 缺少依赖
useEffect(() => {
  fetchData(userId);
}, []);

// ❌ 依赖不完整
useEffect(() => {
  doSomething(a, b);
}, [a]);`,
				docRef: "#fp-patterns - React Hooks 最佳实践",
			}),
			emptyDepsWithoutComment: buildErrorMessage({
				title: "useEffect 空依赖数组需要注释说明",
				reason: `
  空依赖数组意味着 effect 只在挂载时执行一次。
  这是一个重要的设计决策，需要明确注释说明原因。`,
				correctExample: `// ✅ 有注释说明
useEffect(() => {
  // 仅在组件挂载时初始化一次
  initializeApp();
}, []);`,
				incorrectExample: `// ❌ 缺少注释
useEffect(() => {
  initializeApp();
}, []);`,
				docRef: "#code-standards - 注释规范",
			}),
			conditionalHook: buildErrorMessage({
				title: "禁止条件调用 Hooks",
				reason: `
  Hooks 必须在组件顶层调用，不能在条件语句、循环或嵌套函数中调用。
  这是 React Hooks 的基本规则，违反会导致：
  - Hook 调用顺序不一致
  - 状态混乱
  - 运行时错误`,
				correctExample: `// ✅ 在顶层调用
const [value, setValue] = useState('');

if (condition) {
  // 使用状态
  doSomething(value);
}

// ✅ 使用条件渲染
const data = useData();
if (!data) return null;`,
				incorrectExample: `// ❌ 条件调用
if (condition) {
  const [value, setValue] = useState('');
}

// ❌ 循环中调用
for (let i = 0; i < 10; i++) {
  useEffect(() => {}, []);
}

// ❌ 嵌套函数中调用
function helper() {
  const value = useState('');
}`,
				docRef: "https://react.dev/reference/rules/rules-of-hooks",
			}),
			useRefForMutableState: buildErrorMessage({
				title: "useRef 不应用于存储可变业务状态",
				reason: `
  useRef 应该用于：
  - 存储 DOM 引用
  - 存储不触发重新渲染的值（如定时器 ID）
  
  不应该用于：
  - 存储业务状态（应使用 useState）
  - 绕过 React 的状态管理`,
				correctExample: `// ✅ 存储 DOM 引用
const inputRef = useRef<HTMLInputElement>(null);

// ✅ 存储定时器 ID
const timerRef = useRef<number>();

// ✅ 业务状态使用 useState
const [count, setCount] = useState(0);`,
				incorrectExample: `// ❌ 用 useRef 存储业务状态
const countRef = useRef(0);
countRef.current += 1; // 不会触发重新渲染`,
				docRef: "#fp-patterns - React Hooks 最佳实践",
			}),
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		// 跟踪当前作用域深度（用于检测条件调用）
		let scopeDepth = 0
		let inConditional = false
		let inLoop = false

		// Helper function to check useEffect patterns
		const checkUseEffect = (node: TSESTree.CallExpression) => {
			// 检查依赖数组
			if (node.arguments.length < 2) return

			const depsArg = node.arguments[1]

			// 检查空依赖数组
			if (depsArg.type === "ArrayExpression" && depsArg.elements.length === 0) {
				// 检查是否有注释说明
				const comments = context.sourceCode.getCommentsBefore(node)
				const hasComment = comments.some(
					(comment) =>
						comment.value.includes("挂载") ||
						comment.value.includes("mount") ||
						comment.value.includes("一次") ||
						comment.value.includes("once"),
				)

				if (!hasComment) {
					context.report({
						node: depsArg,
						messageId: "emptyDepsWithoutComment",
					})
				}
			}
		}

		// Helper function to check useRef patterns
		const checkUseRef = (node: TSESTree.CallExpression) => {
			// 检查 useRef 的初始值
			if (node.arguments.length === 0) return

			const initArg = node.arguments[0]

			// 检查是否为对象字面量（可能是业务状态）
			if (initArg.type === "ObjectExpression") {
				// 简单启发式：如果对象有多个属性，可能是业务状态
				if (initArg.properties.length > 2) {
					context.report({
						node,
						messageId: "useRefForMutableState",
					})
				}
			}
		}

		return {
			// 检测条件语句
			IfStatement() {
				inConditional = true
			},
			"IfStatement:exit"() {
				inConditional = false
			},

			// 检测循环
			"ForStatement, WhileStatement, DoWhileStatement, ForInStatement, ForOfStatement"() {
				inLoop = true
			},
			"ForStatement:exit, WhileStatement:exit, DoWhileStatement:exit, ForInStatement:exit, ForOfStatement:exit"() {
				inLoop = false
			},

			// 检测函数作用域
			"FunctionDeclaration, FunctionExpression, ArrowFunctionExpression"() {
				scopeDepth++
			},
			"FunctionDeclaration:exit, FunctionExpression:exit, ArrowFunctionExpression:exit"() {
				scopeDepth--
			},

			// 检测 Hook 调用
			CallExpression(node) {
				if (node.callee.type !== "Identifier") return

				const hookName = node.callee.name

				// 检查是否为 Hook 调用（以 use 开头）
				if (!hookName.startsWith("use")) return

				// 检测条件调用
				if ((inConditional || inLoop) && scopeDepth > 0) {
					context.report({
						node,
						messageId: "conditionalHook",
					})
				}

				// 检测 useEffect 模式
				if (hookName === "useEffect") {
					checkUseEffect(node)
				}

				// 检测 useRef 模式
				if (hookName === "useRef") {
					checkUseRef(node)
				}
			},
		}
	},
})
