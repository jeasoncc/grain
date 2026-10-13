/**
 * @fileoverview Rule to prohibit React imports in pure layers
 * @author Grain Team
 */

import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils"
import { getArchitectureLayer, REACT_IMPORTS } from "../utils/index.js"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`,
)

export default createRule({
	create(context) {
		const filename = context.filename
		const currentLayer = getArchitectureLayer(filename)

		// Only apply to pure layers
		const pureLayers = ["pipes", "utils", "io", "state"]
		if (!currentLayer || !pureLayers.includes(currentLayer)) {
			return {}
		}

		function isReactImport(source: string): boolean {
			return REACT_IMPORTS.some((pattern) => {
				if (pattern.endsWith("/*")) {
					const prefix = pattern.slice(0, -2)
					return source === prefix || source.startsWith(prefix + "/")
				}
				return source === pattern
			})
		}

		function isReactTypeImport(node: TSESTree.ImportDeclaration): boolean {
			// Check if it's a type-only import
			if (node.importKind === "type") {
				return true
			}

			// Check if all specifiers are type imports
			return node.specifiers.every(
				(spec) => spec.type === "ImportSpecifier" && spec.importKind === "type",
			)
		}

		return {
			// Also check require() calls
			CallExpression(node: TSESTree.CallExpression) {
				if (
					node.callee.type === "Identifier" &&
					node.callee.name === "require" &&
					node.arguments.length > 0 &&
					node.arguments[0].type === "Literal" &&
					typeof node.arguments[0].value === "string"
				) {
					const source = node.arguments[0].value

					if (isReactImport(source)) {
						context.report({
							data: {
								layer: currentLayer,
							},
							messageId: "noReactInPureLayer",
							node,
						})
					}
				}
			},
			ImportDeclaration(node: TSESTree.ImportDeclaration) {
				const source = node.source.value

				if (typeof source !== "string") return

				if (isReactImport(source)) {
					// Special handling for type-only imports
					if (isReactTypeImport(node)) {
						context.report({
							data: {
								layer: currentLayer,
							},
							messageId: "noReactTypesInPureLayer",
							node,
						})
					} else {
						context.report({
							data: {
								layer: currentLayer,
							},
							messageId: "noReactInPureLayer",
							node,
						})
					}
				}
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "Prohibit React imports in pure layers (pipes, utils, io, state)",
		},
		fixable: undefined,
		messages: {
			noReactInPureLayer: [
				"❌ 禁止在 {{layer}} 层中导入 React！此层应该保持纯净，无副作用。",
				"",
				"🏗️ 架构原则：",
				"  - pipes/: 纯函数，无副作用",
				"  - utils/: 通用工具函数，无副作用",
				"  - io/: IO 操作，无 UI 依赖",
				"  - state/: 状态管理，无 UI 依赖",
				"",
				"✅ 建议：",
				"  - 将 React 相关逻辑移动到 views/ 或 hooks/ 层",
				"  - 保持当前层的纯净性",
				"  - 通过参数传递所需的数据",
				"",
				"📚 更多信息: 查看项目架构文档了解层级职责",
			].join("\n"),
			noReactTypesInPureLayer: [
				"❌ 禁止在 {{layer}} 层中导入 React 类型！",
				"",
				"💡 例外情况：",
				"  - 如果确实需要 React 类型定义，请将其移动到 types/ 层",
				"  - 或者重新考虑架构设计",
				"",
				"✅ 建议：",
				"  - 使用通用的 TypeScript 类型",
				"  - 将 React 特定的类型定义移动到 types/ 层",
			].join("\n"),
		},
		schema: [],
		type: "problem",
	},
	name: "no-react-in-pure-layers",
})
