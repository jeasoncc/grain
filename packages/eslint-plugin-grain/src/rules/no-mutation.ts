/**
 * @fileoverview Rule to prohibit array and object mutations and suggest immutable operations
 * @author Grain Team
 */

import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`,
)

export default createRule({
	create(context) {
		return {
			AssignmentExpression(node: TSESTree.AssignmentExpression) {
				// Check for object property assignments
				if (node.operator === "=" && node.left.type === "MemberExpression") {
					let property = "property"

					if (node.left.property.type === "Identifier") {
						property = node.left.property.name
					} else if (node.left.property.type === "Literal") {
						property = String(node.left.property.value)
					}

					context.report({
						data: {
							property,
						},
						messageId: "noObjectMutation",
						node,
					})
				}
			},
			CallExpression(node: TSESTree.CallExpression) {
				if (node.callee.type === "MemberExpression" && node.callee.property.type === "Identifier") {
					const methodName = node.callee.property.name

					// Array mutation methods
					switch (methodName) {
						case "push":
							context.report({ messageId: "noArrayPush", node })
							break
						case "sort":
							context.report({ messageId: "noArraySort", node })
							break
					}
				}
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "Prohibit array and object mutations and suggest immutable operations",
		},
		fixable: undefined,
		messages: {
			noArrayPush:
				"❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。\n\n✅ 正确做法：\n  const newArray = [...array, newItem];\n  const multipleItems = [...array, item1, item2];",
			noArraySort:
				'❌ 禁止使用 array.sort()！请使用 [...array].sort() 或 fp-ts/Array 的 sort 函数。\n\n✅ 正确做法：\n  const sorted = [...array].sort();\n  const customSort = [...array].sort((a, b) => a.name.localeCompare(b.name));\n  // 或使用 fp-ts\n  import * as A from "fp-ts/Array";\n  const sorted = A.sort(Ord.contramap((item: Item) => item.name)(Ord.ordString))(array);',
			noObjectMutation:
				'❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。\n\n✅ 正确做法：\n  const updated = { ...obj, {{property}}: newValue };\n  const nested = { ...obj, nested: { ...obj.nested, prop: value } };\n  // 或使用 Immer\n  import { produce } from "immer";\n  const updated = produce(obj, draft => { draft.{{property}} = newValue; });',
		},
		schema: [],
		type: "problem",
	},
	name: "no-mutation",
})
