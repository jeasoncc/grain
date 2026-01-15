/**
 * ESLint Rule: no-side-effects-in-pipes
 * 禁止在纯函数层使用副作用
 *
 * pipes/ 和 utils/ 层必须是纯函数，不能包含任何副作用
 *
 * @requirements 3.1-3.9
 * @property Property 4: Side Effect Detection in Pure Layers
 */

import type { TSESTree } from "@typescript-eslint/utils"
import { ESLintUtils } from "@typescript-eslint/utils"
import { SIDE_EFFECT_GLOBALS } from "../../types/config.types.js"
import type { ArchitectureLayer } from "../../types/rule.types.js"
import { getArchitectureLayer, isTestFile } from "../../utils/architecture.js"

const createRule = ESLintUtils.RuleCreator((name) => `https://grain.dev/eslint-rules/${name}`)

type MessageIds =
	| "noSideEffectGlobal"
	| "noSideEffectCall"
	| "noAsyncInPure"
	| "noAwaitInPure"
	| "noPromiseInPure"
	| "noDomAccess"
	| "noStorageAccess"
	| "noNetworkAccess"
	| "noTimerInPure"

/**
 * 纯函数层列表
 */
const PURE_LAYERS: ArchitectureLayer[] = ["pipes", "utils"]

/**
 * DOM 相关的全局对象和方法
 */
const DOM_GLOBALS = [
	"document",
	"window",
	"navigator",
	"location",
	"history",
	"screen",
	"performance",
	"getComputedStyle",
	"matchMedia",
	"requestAnimationFrame",
	"cancelAnimationFrame",
	"IntersectionObserver",
	"MutationObserver",
	"ResizeObserver",
]

/**
 * 存储相关的全局对象
 */
const STORAGE_GLOBALS = ["localStorage", "sessionStorage", "indexedDB", "caches"]

/**
 * 网络相关的全局对象和函数
 */
const NETWORK_GLOBALS = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "Beacon"]

/**
 * 定时器相关的函数
 */
const TIMER_FUNCTIONS = [
	"setTimeout",
	"setInterval",
	"clearTimeout",
	"clearInterval",
	"setImmediate",
	"clearImmediate",
	"requestIdleCallback",
	"cancelIdleCallback",
]

/**
 * 用户交互函数
 */
const USER_INTERACTION_FUNCTIONS = ["alert", "confirm", "prompt", "print"]

/**
 * 获取层级的中文名称
 */
function getLayerChineseName(layer: ArchitectureLayer): string {
	return layer === "pipes" ? "管道层" : "工具层"
}

export default createRule<[], MessageIds>({
	create(context) {
		const filename = context.filename

		// 如果没有文件名，跳过检查
		if (!filename) {
			return {}
		}

		// 跳过测试文件
		if (isTestFile(filename)) {
			return {}
		}

		// 获取当前文件的架构层级
		const currentLayer = getArchitectureLayer(filename)

		// 只检查纯函数层
		if (!currentLayer || !PURE_LAYERS.includes(currentLayer)) {
			return {}
		}

		const layerName = `${getLayerChineseName(currentLayer)} (${currentLayer}/) `

		/**
		 * 检查标识符是否在类型上下文中
		 */
		function isInTypeContext(node: TSESTree.Identifier): boolean {
			const parent = node.parent
			if (!parent) return false

			return (
				parent.type === "TSTypeReference" ||
				parent.type === "TSTypeQuery" ||
				parent.type === "TSQualifiedName" ||
				parent.type === "TSTypeParameterInstantiation"
			)
		}

		/**
		 * 检查是否在字符串或模板字面量中
		 */
		function isInStringContext(node: TSESTree.Identifier): boolean {
			const parent = node.parent
			if (!parent) return false

			return (
				parent.type === "Literal" ||
				parent.type === "TemplateLiteral" ||
				parent.type === "TemplateElement"
			)
		}

		return {
			// 检查 async 箭头函数
			ArrowFunctionExpression(node: TSESTree.ArrowFunctionExpression) {
				if (node.async) {
					context.report({
						data: { layer: layerName },
						messageId: "noAsyncInPure",
						node,
					})
				}
			},

			// 检查 await 表达式
			AwaitExpression(node: TSESTree.AwaitExpression) {
				context.report({
					data: { layer: layerName },
					messageId: "noAwaitInPure",
					node,
				})
			},

			// 检查副作用函数调用
			CallExpression(node: TSESTree.CallExpression) {
				// 检查 console.* 调用
				if (
					node.callee.type === "MemberExpression" &&
					node.callee.object.type === "Identifier" &&
					node.callee.object.name === "console"
				) {
					context.report({
						data: { functionName: "console.*", layer: layerName },
						messageId: "noSideEffectCall",
						node,
					})
					return
				}

				// 检查 document.* 调用
				if (
					node.callee.type === "MemberExpression" &&
					node.callee.object.type === "Identifier" &&
					node.callee.object.name === "document"
				) {
					context.report({
						data: { layer: layerName },
						messageId: "noDomAccess",
						node,
					})
					return
				}

				// 检查 window.* 调用
				if (
					node.callee.type === "MemberExpression" &&
					node.callee.object.type === "Identifier" &&
					node.callee.object.name === "window"
				) {
					context.report({
						data: { layer: layerName },
						messageId: "noDomAccess",
						node,
					})
					return
				}

				// 检查 localStorage/sessionStorage 调用
				if (
					node.callee.type === "MemberExpression" &&
					node.callee.object.type === "Identifier" &&
					STORAGE_GLOBALS.includes(node.callee.object.name)
				) {
					context.report({
						data: { layer: layerName },
						messageId: "noStorageAccess",
						node,
					})
					return
				}
			},

			// 检查 async 函数声明
			FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
				if (node.async) {
					context.report({
						data: { layer: layerName },
						messageId: "noAsyncInPure",
						node,
					})
				}
			},

			// 检查 async 函数表达式
			FunctionExpression(node: TSESTree.FunctionExpression) {
				if (node.async) {
					context.report({
						data: { layer: layerName },
						messageId: "noAsyncInPure",
						node,
					})
				}
			},
			// 检查全局对象访问
			Identifier(node: TSESTree.Identifier) {
				// 跳过类型上下文
				if (isInTypeContext(node) || isInStringContext(node)) {
					return
				}

				// 跳过属性访问的属性名
				if (
					node.parent?.type === "MemberExpression" &&
					node.parent.property === node &&
					!node.parent.computed
				) {
					return
				}

				// 跳过对象属性的键
				if (node.parent?.type === "Property" && node.parent.key === node) {
					return
				}

				const name = node.name

				// 检查 DOM 全局对象
				if (DOM_GLOBALS.includes(name)) {
					context.report({
						data: { layer: layerName },
						messageId: "noDomAccess",
						node,
					})
					return
				}

				// 检查存储全局对象
				if (STORAGE_GLOBALS.includes(name)) {
					context.report({
						data: { layer: layerName },
						messageId: "noStorageAccess",
						node,
					})
					return
				}

				// 检查网络全局对象
				if (NETWORK_GLOBALS.includes(name)) {
					context.report({
						data: { layer: layerName },
						messageId: "noNetworkAccess",
						node,
					})
					return
				}

				// 检查定时器函数
				if (TIMER_FUNCTIONS.includes(name)) {
					context.report({
						data: { layer: layerName },
						messageId: "noTimerInPure",
						node,
					})
					return
				}

				// 检查用户交互函数
				if (USER_INTERACTION_FUNCTIONS.includes(name)) {
					context.report({
						data: { functionName: name, layer: layerName },
						messageId: "noSideEffectCall",
						node,
					})
					return
				}

				// 检查其他副作用全局对象
				if ((SIDE_EFFECT_GLOBALS as readonly string[]).includes(name)) {
					context.report({
						data: { globalName: name, layer: layerName },
						messageId: "noSideEffectGlobal",
						node,
					})
				}
			},

			// 检查 new Promise()
			NewExpression(node: TSESTree.NewExpression) {
				if (node.callee.type === "Identifier" && node.callee.name === "Promise") {
					context.report({
						data: { layer: layerName },
						messageId: "noPromiseInPure",
						node,
					})
				}
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "禁止在纯函数层（pipes/, utils/）使用副作用",
		},
		messages: {
			noAsyncInPure: `❌ {{ layer }}禁止使用 async 函数

🔍 原因：
  纯函数应该是同步的，异步操作属于副作用。
  async 函数会引入不确定性和时序依赖。

🔄 异步操作处理：
  - 将异步操作移动到 flows/ 层
  - 使用 TaskEither 处理异步流程
  - 让 pipes/ 只处理数据转换

✅ 正确的架构：
  flows/ → 异步操作 + 调用 pipes/
  pipes/ → 纯数据转换

📚 参考文档：#fp-patterns - TaskEither`,

			noAwaitInPure: `❌ {{ layer }}禁止使用 await 表达式

🔍 原因：
  await 表示异步操作，纯函数层不应包含异步代码。

✅ 修复方案：
  将包含 await 的代码移动到 flows/ 层

📚 参考文档：#architecture - 流程层`,

			noDomAccess: `❌ {{ layer }}禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层`,

			noNetworkAccess: `❌ {{ layer }}禁止进行网络请求

🔍 原因：
  网络请求（fetch, XMLHttpRequest）是副作用。
  纯函数不应进行 IO 操作。

✅ 修复方案：
  1. 将网络请求移动到 io/api/ 层
  2. 使用 TaskEither 包装网络请求

📚 参考文档：#architecture - IO 层`,

			noPromiseInPure: `❌ {{ layer }}禁止创建 Promise

🔍 原因：
  Promise 表示异步操作，纯函数层不应包含异步代码。
  new Promise() 会引入副作用和不确定性。

✅ 修复方案：
  1. 将 Promise 相关代码移动到 flows/ 层
  2. 使用 TaskEither 替代 Promise

📚 参考文档：#fp-patterns - TaskEither`,

			noSideEffectCall: `❌ {{ layer }}禁止调用副作用函数 {{ functionName }}

🔍 原因：
  {{ functionName }} 会产生副作用，破坏函数的纯净性。

🔍 常见副作用函数：
  - console.* (日志输出)
  - alert, confirm, prompt (用户交互)
  - fetch, XMLHttpRequest (网络请求)
  - localStorage, sessionStorage (存储操作)
  - DOM 操作函数

✅ 修复方案：
  1. 将这些操作移动到 flows/ 或 io/ 层
  2. 让纯函数返回需要执行的操作描述
  3. 在管道的末端处理副作用

📚 参考文档：#architecture - 纯函数层`,
			noSideEffectGlobal: `❌ {{ layer }}禁止访问全局对象 {{ globalName }}

🔍 原因：
  纯函数不能依赖或修改外部状态。
  访问全局对象会破坏函数的纯净性。

🧪 纯函数原则：
  - 相同输入总是产生相同输出
  - 不能有副作用（不能修改外部状态）
  - 不能依赖外部状态

✅ 修复方案：
  1. 将副作用操作移动到 io/ 层
  2. 通过参数传递所需的数据
  3. 返回数据而不是直接执行副作用

📚 参考文档：#fp-patterns - 纯函数`,

			noStorageAccess: `❌ {{ layer }}禁止访问存储 API

🔍 原因：
  存储操作（localStorage, sessionStorage, indexedDB）是副作用。
  纯函数不应进行 IO 操作。

✅ 修复方案：
  1. 将存储操作移动到 io/storage/ 层
  2. 通过参数传递所需的数据

📚 参考文档：#architecture - IO 层`,

			noTimerInPure: `❌ {{ layer }}禁止使用定时器

🔍 原因：
  定时器（setTimeout, setInterval）是副作用。
  它们会引入时序依赖和不确定性。

✅ 修复方案：
  1. 将定时器相关代码移动到 flows/ 层
  2. 考虑使用响应式编程模式

📚 参考文档：#architecture - 流程层`,
		},
		schema: [],
		type: "problem",
	},
	name: "no-side-effects-in-pipes",
})
