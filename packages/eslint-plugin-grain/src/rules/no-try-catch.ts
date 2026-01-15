/**
 * @fileoverview Rule to prohibit try-catch statements and suggest TaskEither usage
 * @author Grain Team
 */

import { ESLintUtils } from "@typescript-eslint/utils"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`,
)

import type { TSESTree } from "@typescript-eslint/utils"

export default createRule({
	create(context) {
		return {
			CatchClause(node: TSESTree.CatchClause) {
				context.report({
					messageId: "noCatch",
					node,
				})
			},

			ThrowStatement(node: TSESTree.ThrowStatement) {
				context.report({
					messageId: "noThrow",
					node,
				})
			},
			TryStatement(node: TSESTree.TryStatement) {
				context.report({
					messageId: "noTryCatch",
					node,
				})
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "Prohibit try-catch statements and suggest TaskEither usage",
		},
		fixable: undefined,
		messages: {
			noCatch: [
				"❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。",
				"",
				"✅ 正确做法：",
				"  pipe(",
				"    fetchData(),",
				"    TE.orElse(() => fetchFromBackup())",
				"  )",
			].join("\n"),
			noThrow: [
				"❌ 禁止使用 throw 语句！请返回 TaskEither.left() 表示错误。",
				"",
				"✅ 正确做法：",
				'  return TE.left({ type: "VALIDATION_ERROR", message: "Invalid input" });',
			].join("\n"),
			noTryCatch: [
				"❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。",
				"",
				"✅ 正确做法：",
				'  import * as TE from "fp-ts/TaskEither";',
				"  const result = TE.tryCatch(",
				"    () => riskyOperation(),",
				'    (error) => ({ type: "ERROR", message: String(error) })',
				"  );",
				"",
				"📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html",
			].join("\n"),
		},
		schema: [],
		type: "problem",
	},
	name: "no-try-catch",
})
