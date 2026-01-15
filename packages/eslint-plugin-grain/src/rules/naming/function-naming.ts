import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils"
import { DEFAULT_NAMING_CONFIG } from "../../types/config.types"
import { buildErrorMessage, buildWarningMessage } from "../../utils/message-builder"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`,
)

export default createRule({
	create(context) {
		const { verbPrefixes, eventHandlerPrefixes } = DEFAULT_NAMING_CONFIG

		function startsWithVerb(name: string): boolean {
			return verbPrefixes.some((verb) => name.toLowerCase().startsWith(verb.toLowerCase()))
		}

		function isEventHandler(name: string): boolean {
			return eventHandlerPrefixes.some((prefix) =>
				name.toLowerCase().startsWith(prefix.toLowerCase()),
			)
		}

		function checkFunctionName(name: string, node: any) {
			// 跳过 React 组件（首字母大写）
			if (/^[A-Z]/.test(name)) {
				return
			}

			// 跳过私有函数（以 _ 开头）
			if (name.startsWith("_")) {
				return
			}

			// 检查事件处理器命名
			if (name.includes("handler") || name.includes("Handler")) {
				if (!isEventHandler(name)) {
					context.report({
						data: {
							name,
							prefixes: eventHandlerPrefixes.join(" 或 "),
						},
						messageId: "invalidEventHandler",
						node,
					})
					return
				}
			}

			// 检查是否以动词开头
			if (!startsWithVerb(name) && !isEventHandler(name)) {
				context.report({
					data: {
						name,
						suggestion: getSuggestion(name),
					},
					messageId: "noVerbPrefix",
					node,
				})
			}
		}

		function getSuggestion(name: string): string {
			// 尝试提供智能建议
			if (name.includes("user")) return `getUser, createUser, updateUser, deleteUser`
			if (name.includes("data")) return `getData, transformData, validateData`
			if (name.includes("node")) return `getNode, createNode, updateNode`
			return `get${capitalize(name)}, create${capitalize(name)}, update${capitalize(name)}`
		}

		function capitalize(str: string): string {
			return str.charAt(0).toUpperCase() + str.slice(1)
		}

		return {
			FunctionDeclaration(node) {
				if (node.id && node.id.type === AST_NODE_TYPES.Identifier) {
					checkFunctionName(node.id.name, node.id)
				}
			},
			VariableDeclarator(node) {
				// 检查函数表达式和箭头函数
				if (
					node.id.type === AST_NODE_TYPES.Identifier &&
					(node.init?.type === AST_NODE_TYPES.FunctionExpression ||
						node.init?.type === AST_NODE_TYPES.ArrowFunctionExpression)
				) {
					checkFunctionName(node.id.name, node.id)
				}
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "强制执行函数命名规范（动词开头、事件处理器命名）",
		},
		messages: {
			invalidEventHandler: "事件处理器命名不符合规范",
			noVerbPrefix: "函数名应以动词开头",
		},
		schema: [],
		type: "problem",
	},
	name: "function-naming",
})
