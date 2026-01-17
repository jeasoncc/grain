/**
 * @fileoverview Rule to prohibit console usage and suggest logger usage
 * @author Grain Team
 */

import { ESLintUtils } from "@typescript-eslint/utils"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`,
)

import type { TSESTree } from "@typescript-eslint/utils"
import { isMethodCall } from "../utils/index.js"

export default createRule({
	create(context) {
		return {
			CallExpression(node: TSESTree.CallExpression) {
				// Check for console.* method calls
				if (
					node.callee.type === "MemberExpression" &&
					node.callee.object.type === "Identifier" &&
					node.callee.object.name === "console" &&
					node.callee.property.type === "Identifier"
				) {
					const method = node.callee.property.name

					// Map console methods to logger levels
					const logLevelMap: Record<string, string> = {
						assert: "error",
						count: "debug",
						debug: "debug",
						dir: "debug",
						error: "error",
						group: "debug",
						groupCollapsed: "debug",
						groupEnd: "debug",
						info: "info",
						log: "info",
						table: "debug",
						time: "debug",
						timeEnd: "debug",
						trace: "debug",
						warn: "warn",
					}

					const logLevel = logLevelMap[method] || "info"

					context.report({
						data: {
							logLevel,
							method,
						},
						messageId: "noConsole",
						node,
					})
				}
			},

			// Also catch direct console identifier usage
			Identifier(node: TSESTree.Identifier) {
				if (
					node.name === "console" &&
					node.parent?.type === "MemberExpression" &&
					node.parent.object === node
				) {
					// This will be caught by CallExpression above, so we don't need to report here
					return
				}

				// Catch standalone console references
				if (node.name === "console" && node.parent?.type !== "MemberExpression") {
					context.report({
						data: {
							logLevel: "info",
							method: "object",
						},
						messageId: "noConsole",
						node,
					})
				}
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "Prohibit console usage and suggest logger usage with proper format",
		},
		fixable: undefined,
		messages: {
			noConsole: [
				"❌ 禁止使用 console.{{method}}！请使用日志函数进行日志记录。",
				"",
				"✅ 正确做法：",
				'  import { {{logLevel}} } from "@/io/log";',
				'  {{logLevel}}("[ModuleName] 操作描述", data);',
				"",
				"📋 可用的日志函数：",
				"  - info(message, data?)    // 一般信息记录",
				"  - warn(message, data?)    // 警告信息",
				"  - error(message, data?)   // 错误信息",
				"  - debug(message, data?)   // 调试信息",
				"  - success(message, data?) // 成功信息",
				"  - trace(message, data?)   // 追踪信息",
				"",
				"🔗 更多信息: 查看项目中的日志规范文档",
			].join("\n"),
		},
		schema: [],
		type: "problem",
	},
	name: "no-console-log",
})
