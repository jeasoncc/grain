/**
 * @fileoverview Rule to prohibit side effects in pipes layer
 * @author Grain Team
 */

import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils"
import { SIDE_EFFECT_GLOBALS } from "../types/config.types.js"
import { getArchitectureLayer } from "../utils/index.js"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`,
)

export default createRule({
	name: "no-side-effects-in-pipes",
	meta: {
		type: "problem",
		docs: {
			description: "Prohibit side effects in pipes layer to maintain pure functions",
		},
		fixable: undefined,
		schema: [],
		messages: {
			noSideEffectGlobal: [
				"❌ 禁止在 pipes/ 中访问全局对象 {{globalName}}！纯函数不能有副作用。",
				"",
				"🧪 纯函数原则：",
				"  - 相同输入总是产生相同输出",
				"  - 不能有副作用（不能修改外部状态）",
				"  - 不能依赖外部状态",
				"",
				"✅ 建议：",
				"  - 将副作用操作移动到 io/ 层",
				"  - 通过参数传递所需的数据",
				"  - 返回数据而不是直接执行副作用",
				"",
				"📚 更多信息: 查看函数式编程指南",
			].join("\n"),
			noSideEffectCall: [
				"❌ 禁止在 pipes/ 中调用可能产生副作用的函数 {{functionName}}！",
				"",
				"🔍 常见副作用函数：",
				"  - console.* (日志输出)",
				"  - alert, confirm, prompt (用户交互)",
				"  - fetch, XMLHttpRequest (网络请求)",
				"  - localStorage, sessionStorage (存储操作)",
				"  - DOM 操作函数",
				"",
				"✅ 建议：",
				"  - 将这些操作移动到 flows/ 或 io/ 层",
				"  - 让纯函数返回需要执行的操作描述",
				"  - 在管道的末端处理副作用",
			].join("\n"),
			noAsyncInPipes: [
				"❌ 禁止在 pipes/ 中使用异步操作！纯函数应该是同步的。",
				"",
				"🔄 异步操作处理：",
				"  - 将异步操作移动到 flows/ 层",
				"  - 使用 TaskEither 处理异步流程",
				"  - 让 pipes/ 只处理数据转换",
				"",
				"✅ 正确的架构：",
				"  flows/ → 异步操作 + 调用 pipes/",
				"  pipes/ → 纯数据转换",
			].join("\n"),
		},
	},
	defaultOptions: [],
	create(context) {
		const filename = context.getFilename()
		const currentLayer = getArchitectureLayer(filename)

		// Only apply to pipes layer
		if (currentLayer !== "pipes") {
			return {}
		}

		return {
			// Check for global object access
			Identifier(node: TSESTree.Identifier) {
				if ((SIDE_EFFECT_GLOBALS as readonly string[]).includes(node.name)) {
					// Skip if it's part of a type annotation
					if (node.parent?.type === "TSTypeReference" || node.parent?.type === "TSTypeQuery") {
						return
					}

					// Skip if it's in a comment or string
					if (node.parent?.type === "Literal" || node.parent?.type === "TemplateLiteral") {
						return
					}

					context.report({
						node,
						messageId: "noSideEffectGlobal",
						data: {
							globalName: node.name,
						},
					})
				}
			},

			// Check for side effect function calls
			CallExpression(node: TSESTree.CallExpression) {
				// Check for console.* calls
				if (
					node.callee.type === "MemberExpression" &&
					node.callee.object.type === "Identifier" &&
					node.callee.object.name === "console"
				) {
					context.report({
						node,
						messageId: "noSideEffectCall",
						data: {
							functionName: "console.*",
						},
					})
					return
				}

				// Check for other side effect functions
				if (node.callee.type === "Identifier") {
					const sideEffectFunctions = [
						"alert",
						"confirm",
						"prompt",
						"setTimeout",
						"setInterval",
						"clearTimeout",
						"clearInterval",
					]

					if (sideEffectFunctions.includes(node.callee.name)) {
						context.report({
							node,
							messageId: "noSideEffectCall",
							data: {
								functionName: node.callee.name,
							},
						})
					}
				}

				// Check for fetch calls
				if (node.callee.type === "Identifier" && node.callee.name === "fetch") {
					context.report({
						node,
						messageId: "noSideEffectCall",
						data: {
							functionName: "fetch",
						},
					})
				}
			},

			// Check for async functions
			FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
				if (node.async) {
					context.report({
						node,
						messageId: "noAsyncInPipes",
					})
				}
			},

			FunctionExpression(node: TSESTree.FunctionExpression) {
				if (node.async) {
					context.report({
						node,
						messageId: "noAsyncInPipes",
					})
				}
			},

			ArrowFunctionExpression(node: TSESTree.ArrowFunctionExpression) {
				if (node.async) {
					context.report({
						node,
						messageId: "noAsyncInPipes",
					})
				}
			},

			// Check for await expressions
			AwaitExpression(node: TSESTree.AwaitExpression) {
				context.report({
					node,
					messageId: "noAsyncInPipes",
				})
			},

			// Check for Promise usage
			NewExpression(node: TSESTree.NewExpression) {
				if (node.callee.type === "Identifier" && node.callee.name === "Promise") {
					context.report({
						node,
						messageId: "noAsyncInPipes",
					})
				}
			},
		}
	},
})
