import type { TSESTree } from "@typescript-eslint/utils"
import { ESLintUtils } from "@typescript-eslint/utils"
import { DEFAULT_COMPLEXITY_CONFIG } from "../../types/config.types"
import { buildErrorMessage } from "../../utils/message-builder"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`,
)

type MessageIds = "maxNesting"
type Options = [{ max?: number }]

export default createRule<Options, MessageIds>({
	name: "max-nesting",
	meta: {
		type: "problem",
		docs: {
			description: "限制代码块嵌套最大层级",
		},
		messages: {
			maxNesting: buildErrorMessage({
				title: "代码块嵌套超过 {{max}} 层（当前 {{actual}} 层）",
				reason: `深层嵌套降低代码可读性：
  - 增加认知负担
  - 难以理解控制流
  - 容易出现逻辑错误
  - 违反扁平化原则`,
				correctExample: `// ✅ 使用早返回和 pipe
function process(data: Data | null) {
  if (!data?.items) return;
  
  const validItems = pipe(
    data.items,
    A.filter(item => item.valid),
    A.map(processItem)
  );
  
  return validItems;
}

// ✅ 提取函数
function processValidItem(item: Item) {
  if (!item.valid) return null;
  return transformItem(item);
}

function process(data: Data) {
  return data.items
    .map(processValidItem)
    .filter(Boolean);
}`,
				incorrectExample: `// ❌ 嵌套过深
function process(data) {
  if (data) {
    if (data.items) {
      for (const item of data.items) {
        if (item.valid) {
          if (item.type === 'special') {
            // 处理逻辑（4 层嵌套）
          }
        }
      }
    }
  }
}`,
				docRef: "#code-standards - 复杂度限制",
			}),
		},
		schema: [
			{
				type: "object",
				properties: {
					max: {
						type: "number",
						minimum: 0,
					},
				},
				additionalProperties: false,
			},
		],
	},
	defaultOptions: [{ max: DEFAULT_COMPLEXITY_CONFIG.maxNesting }],
	create(context, [options]) {
		const maxNesting = options.max ?? DEFAULT_COMPLEXITY_CONFIG.maxNesting
		let currentNesting = 0

		function increaseNesting(node: TSESTree.Node) {
			currentNesting++
			if (currentNesting > maxNesting) {
				context.report({
					node,
					messageId: "maxNesting",
					data: {
						max: String(maxNesting),
						actual: String(currentNesting),
					},
				})
			}
		}

		function decreaseNesting() {
			currentNesting--
		}

		const nestingNodes = {
			IfStatement: increaseNesting,
			"IfStatement:exit": decreaseNesting,
			ForStatement: increaseNesting,
			"ForStatement:exit": decreaseNesting,
			ForInStatement: increaseNesting,
			"ForInStatement:exit": decreaseNesting,
			ForOfStatement: increaseNesting,
			"ForOfStatement:exit": decreaseNesting,
			WhileStatement: increaseNesting,
			"WhileStatement:exit": decreaseNesting,
			DoWhileStatement: increaseNesting,
			"DoWhileStatement:exit": decreaseNesting,
			SwitchStatement: increaseNesting,
			"SwitchStatement:exit": decreaseNesting,
			TryStatement: increaseNesting,
			"TryStatement:exit": decreaseNesting,
			WithStatement: increaseNesting,
			"WithStatement:exit": decreaseNesting,
		}

		return nestingNodes
	},
})
