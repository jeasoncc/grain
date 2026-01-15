/**
 * @fileoverview Rule to prohibit Date constructor and suggest dayjs usage
 * @author Grain Team
 */

import { ESLintUtils } from "@typescript-eslint/utils"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`,
)

import type { TSESTree } from "@typescript-eslint/utils"

export default createRule({
	name: "no-date-constructor",
	meta: {
		type: "problem",
		docs: {
			description: "Prohibit Date constructor and Date.now() usage, suggest dayjs alternatives",
		},
		fixable: undefined,
		schema: [],
		messages: {
			noDateConstructor: [
				"❌ 禁止使用 new Date()！请使用 dayjs 进行时间处理。",
				"",
				"✅ 正确做法：",
				'  import dayjs from "dayjs";',
				"  const now = dayjs();",
				'  const specificDate = dayjs("2023-01-01");',
				"  const timestamp = dayjs().valueOf();",
				"",
				"📚 dayjs 文档: https://day.js.org/docs/en/installation/installation",
			].join("\n"),
			noDateNow: [
				"❌ 禁止使用 Date.now()！请使用 dayjs 获取时间戳。",
				"",
				"✅ 正确做法：",
				'  import dayjs from "dayjs";',
				"  const timestamp = dayjs().valueOf();",
				"  const unixTimestamp = dayjs().unix();",
			].join("\n"),
			noDateMethods: [
				"❌ 禁止使用 Date.{{method}}()！请使用 dayjs 的对应方法。",
				"",
				"✅ 正确做法：",
				'  import dayjs from "dayjs";',
				"  // 根据具体需求使用 dayjs 的相应方法",
			].join("\n"),
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			NewExpression(node: TSESTree.NewExpression) {
				if (node.callee.type === "Identifier" && node.callee.name === "Date") {
					context.report({
						node,
						messageId: "noDateConstructor",
					})
				}
			},

			CallExpression(node: TSESTree.CallExpression) {
				// Check for Date.now()
				if (
					node.callee.type === "MemberExpression" &&
					node.callee.object.type === "Identifier" &&
					node.callee.object.name === "Date" &&
					node.callee.property.type === "Identifier" &&
					node.callee.property.name === "now"
				) {
					context.report({
						node,
						messageId: "noDateNow",
					})
				}

				// Check for other Date static methods
				if (
					node.callee.type === "MemberExpression" &&
					node.callee.object.type === "Identifier" &&
					node.callee.object.name === "Date" &&
					node.callee.property.type === "Identifier"
				) {
					const method = node.callee.property.name
					const staticMethods = ["parse", "UTC"]

					if (staticMethods.includes(method)) {
						context.report({
							node,
							messageId: "noDateMethods",
							data: {
								method,
							},
						})
					}
				}

				// Check for Date() function call (without new)
				if (node.callee.type === "Identifier" && node.callee.name === "Date") {
					context.report({
						node,
						messageId: "noDateConstructor",
					})
				}
			},
		}
	},
})
