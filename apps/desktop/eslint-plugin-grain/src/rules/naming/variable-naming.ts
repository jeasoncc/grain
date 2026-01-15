import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils"
import { DEFAULT_NAMING_CONFIG } from "../../types/config.types"
import { buildErrorMessage } from "../../utils/message-builder"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`,
)

export default createRule({
	name: "variable-naming",
	meta: {
		type: "problem",
		docs: {
			description: "强制执行变量命名规范（最小长度和允许的短变量名）",
		},
		messages: {
			variableTooShort: "变量名过短",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const { minVariableLength, allowedShortNames } = DEFAULT_NAMING_CONFIG

		function checkVariableName(name: string, node: any) {
			// 跳过允许的短变量名
			if (allowedShortNames.includes(name)) {
				return
			}

			// 跳过私有变量（以 _ 开头）
			if (name.startsWith("_")) {
				return
			}

			// 检查最小长度
			if (name.length < minVariableLength) {
				context.report({
					node,
					messageId: "variableTooShort",
					data: {
						name,
						length: name.length.toString(),
						minLength: minVariableLength.toString(),
					},
				})
			}
		}

		return {
			VariableDeclarator(node) {
				if (node.id.type === AST_NODE_TYPES.Identifier) {
					checkVariableName(node.id.name, node.id)
				}
			},
			FunctionDeclaration(node) {
				// 检查函数参数
				node.params.forEach((param) => {
					if (param.type === AST_NODE_TYPES.Identifier) {
						checkVariableName(param.name, param)
					}
				})
			},
			ArrowFunctionExpression(node) {
				// 检查箭头函数参数
				node.params.forEach((param) => {
					if (param.type === AST_NODE_TYPES.Identifier) {
						checkVariableName(param.name, param)
					}
				})
			},
		}
	},
})
