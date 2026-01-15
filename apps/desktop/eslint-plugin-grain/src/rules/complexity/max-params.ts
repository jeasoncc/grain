import type { TSESTree } from "@typescript-eslint/utils"
import { ESLintUtils } from "@typescript-eslint/utils"
import { DEFAULT_COMPLEXITY_CONFIG } from "../../types/config.types"
import { buildErrorMessage } from "../../utils/message-builder"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`,
)

type MessageIds = "maxParams"
type Options = [{ max?: number }]

export default createRule<Options, MessageIds>({
	create(context, [options]) {
		const maxParams = options.max ?? DEFAULT_COMPLEXITY_CONFIG.maxParams

		function checkParams(
			node:
				| TSESTree.FunctionDeclaration
				| TSESTree.FunctionExpression
				| TSESTree.ArrowFunctionExpression,
		) {
			const actualParams = node.params.length

			if (actualParams > maxParams) {
				const functionName = getFunctionName(node)
				context.report({
					data: {
						actual: String(actualParams),
						functionName,
						max: String(maxParams),
					},
					messageId: "maxParams",
					node,
				})
			}
		}

		return {
			ArrowFunctionExpression: checkParams,
			FunctionDeclaration: checkParams,
			FunctionExpression: checkParams,
		}
	},
	defaultOptions: [{ max: DEFAULT_COMPLEXITY_CONFIG.maxParams }],
	meta: {
		docs: {
			description: "限制函数参数最大数量",
		},
		messages: {
			maxParams: buildErrorMessage({
				correctExample: `// ✅ 使用对象参数
interface CreateUserParams {
  name: string;
  email: string;
  age: number;
  role: string;
  department: string;
}

function createUser(params: CreateUserParams) {
  const { name, email, age, role, department } = params;
  // 实现逻辑
}

// 调用时更清晰
createUser({
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
  role: 'developer',
  department: 'engineering',
});`,
				docRef: "#code-standards - 复杂度限制",
				incorrectExample: `// ❌ 参数过多
function createUser(
  name: string,
  email: string,
  age: number,
  role: string,
  department: string
) {
  // 实现逻辑
}

// 调用时容易出错
createUser('Alice', 'alice@example.com', 30, 'developer', 'engineering');`,
				reason: `过多的参数表明函数职责不清晰：
  - 函数做了太多事情
  - 参数顺序难以记忆
  - 调用时容易出错
  - 难以扩展和维护`,
				title: "函数 {{functionName}} 参数超过 {{max}} 个（当前 {{actual}} 个）",
			}),
		},
		schema: [
			{
				additionalProperties: false,
				properties: {
					max: {
						minimum: 0,
						type: "number",
					},
				},
				type: "object",
			},
		],
		type: "problem",
	},
	name: "max-params",
})

function getFunctionName(
	node:
		| TSESTree.FunctionDeclaration
		| TSESTree.FunctionExpression
		| TSESTree.ArrowFunctionExpression,
): string {
	if (node.type === "FunctionDeclaration" && node.id) {
		return node.id.name
	}

	if (node.parent) {
		if (node.parent.type === "VariableDeclarator" && node.parent.id.type === "Identifier") {
			return node.parent.id.name
		}
		if (node.parent.type === "Property" && node.parent.key.type === "Identifier") {
			return node.parent.key.name
		}
		if (node.parent.type === "MethodDefinition" && node.parent.key.type === "Identifier") {
			return node.parent.key.name
		}
	}

	return "(匿名函数)"
}
