import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils"
import { DEFAULT_NAMING_CONFIG } from "../../types/config.types"
import { buildErrorMessage } from "../../utils/message-builder"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`,
)

export default createRule({
	create(context) {
		const { booleanPrefixes } = DEFAULT_NAMING_CONFIG

		function hasBooleanPrefix(name: string): boolean {
			return booleanPrefixes.some((prefix) => name.toLowerCase().startsWith(prefix.toLowerCase()))
		}

		function isBooleanType(node: any): boolean {
			// 检查类型注解
			if (node.typeAnnotation?.typeAnnotation?.type === AST_NODE_TYPES.TSBooleanKeyword) {
				return true
			}

			// 检查初始值
			if (node.init) {
				// 字面量 true/false
				if (node.init.type === AST_NODE_TYPES.Literal && typeof node.init.value === "boolean") {
					return true
				}
				// 一元表达式 !something
				if (node.init.type === AST_NODE_TYPES.UnaryExpression && node.init.operator === "!") {
					return true
				}
				// 比较表达式
				if (node.init.type === AST_NODE_TYPES.BinaryExpression) {
					const comparisonOps = ["===", "!==", "==", "!=", "<", ">", "<=", ">="]
					if (comparisonOps.includes(node.init.operator)) {
						return true
					}
				}
				// 逻辑表达式
				if (node.init.type === AST_NODE_TYPES.LogicalExpression) {
					return true
				}
			}

			return false
		}

		function checkBooleanName(name: string, node: any, declarator: any) {
			// 跳过私有变量
			if (name.startsWith("_")) {
				return
			}

			// 跳过解构赋值
			if (
				declarator.parent?.type === AST_NODE_TYPES.VariableDeclaration &&
				declarator.id.type !== AST_NODE_TYPES.Identifier
			) {
				return
			}

			if (isBooleanType(declarator) && !hasBooleanPrefix(name)) {
				context.report({
					data: {
						name,
						prefixes: booleanPrefixes.join(", "),
					},
					messageId: "invalidBooleanName",
					node,
				})
			}
		}

		return {
			FunctionDeclaration(node) {
				// 检查函数参数
				node.params.forEach((param) => {
					if (param.type === AST_NODE_TYPES.Identifier) {
						// 只检查有类型注解的布尔参数
						if (param.typeAnnotation?.typeAnnotation?.type === AST_NODE_TYPES.TSBooleanKeyword) {
							if (!hasBooleanPrefix(param.name) && !param.name.startsWith("_")) {
								context.report({
									data: {
										name: param.name,
										prefixes: booleanPrefixes.join(", "),
									},
									messageId: "invalidBooleanName",
									node: param,
								})
							}
						}
					}
				})
			},
			VariableDeclarator(node) {
				if (node.id.type === AST_NODE_TYPES.Identifier) {
					checkBooleanName(node.id.name, node.id, node)
				}
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "强制执行布尔变量命名规范（必须以 is/has/can/should 等开头）",
		},
		messages: {
			invalidBooleanName: "布尔变量命名不符合规范",
		},
		schema: [],
		type: "problem",
	},
	name: "boolean-naming",
})
