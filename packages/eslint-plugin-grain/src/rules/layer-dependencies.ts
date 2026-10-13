/**
 * @fileoverview Rule to enforce architecture layer dependency rules
 * @author Grain Team
 */

import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils"
import {
	getAllowedDependencies,
	getArchitectureLayer,
	getImportLayer,
	isContainerComponent,
	isExternalImport,
} from "../utils/index.js"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`,
)

export default createRule({
	create(context) {
		const filename = context.filename
		const currentLayer = getArchitectureLayer(filename)

		// Skip if we can't determine the layer
		if (!currentLayer) {
			return {}
		}

		const allowedLayers = getAllowedDependencies(currentLayer)
		const isContainer = isContainerComponent(filename)

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

					// Skip external imports
					if (isExternalImport(source)) return

					// Get the layer being imported
					const importLayer = getImportLayer(source)

					if (!importLayer) return

					// Apply same rules as ImportDeclaration
					if (currentLayer === "views") {
						if (isContainer) {
							const containerAllowedLayers = ["hooks", "flows", "state", "types"]
							if (!containerAllowedLayers.includes(importLayer)) {
								context.report({
									data: {
										allowedLayers: containerAllowedLayers.join(", "),
										currentLayer: "container component",
										importLayer,
									},
									messageId: "layerViolation",
									node,
								})
							}
							return
						}

						if (!allowedLayers.includes(importLayer)) {
							context.report({
								data: {
									importLayer,
								},
								messageId: "containerException",
								node,
							})
							return
						}
					}

					// Special case for state layer
					if (currentLayer === "state" && importLayer === "pipes") {
						if (filename.includes("theme.state.ts")) {
							return
						}
					}

					if (!allowedLayers.includes(importLayer)) {
						context.report({
							data: {
								allowedLayers: allowedLayers.join(", "),
								currentLayer,
								importLayer,
							},
							messageId: "layerViolation",
							node,
						})
					}
				}
			},
			ImportDeclaration(node: TSESTree.ImportDeclaration) {
				const source = node.source.value

				if (typeof source !== "string") return

				// Skip external imports
				if (isExternalImport(source)) return

				// Get the layer being imported
				const importLayer = getImportLayer(source)

				if (!importLayer) return

				// Special handling for views layer
				if (currentLayer === "views") {
					// Container components have more relaxed rules
					if (isContainer) {
						const containerAllowedLayers = ["hooks", "flows", "state", "types"]
						if (!containerAllowedLayers.includes(importLayer)) {
							context.report({
								data: {
									allowedLayers: containerAllowedLayers.join(", "),
									currentLayer: "container component",
									importLayer,
								},
								messageId: "layerViolation",
								node,
							})
						}
						return
					}

					// Regular view components have strict rules
					if (!allowedLayers.includes(importLayer)) {
						context.report({
							data: {
								importLayer,
							},
							messageId: "containerException",
							node,
						})
						return
					}
				}

				// Special case for state layer - allow pipes for theme.state exception
				if (currentLayer === "state" && importLayer === "pipes") {
					// Allow pipes import only for theme.state.ts
					if (filename.includes("theme.state.ts")) {
						return
					}
				}

				// Check general layer dependencies
				if (!allowedLayers.includes(importLayer)) {
					context.report({
						data: {
							allowedLayers: allowedLayers.join(", "),
							currentLayer,
							importLayer,
						},
						messageId: "layerViolation",
						node,
					})
				}
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "Enforce architecture layer dependency rules",
		},
		fixable: undefined,
		messages: {
			containerException: [
				"❌ 视图组件架构违规！普通视图组件不能直接依赖 {{importLayer}} 层。",
				"",
				"🏗️ 组件分离原则：",
				"  - 视图组件(.view.fn.tsx)：只能依赖 hooks/ 和 types/",
				"  - 容器组件(.container.fn.tsx)：可以依赖更多层级",
				"",
				"✅ 建议：",
				"  - 将此组件改为容器组件(.container.fn.tsx)",
				"  - 或通过 hooks 间接访问数据",
				"  - 或将逻辑移动到容器组件中",
			].join("\n"),
			layerViolation: [
				"❌ 架构层级违规！{{currentLayer}} 层不能依赖 {{importLayer}} 层。",
				"",
				"🏗️ 架构规则：",
				"  {{currentLayer}} 只能依赖：{{allowedLayers}}",
				"",
				"✅ 建议：",
				"  - 将此功能移动到合适的层级",
				"  - 或通过允许的层级间接访问",
				"",
				"📚 架构文档: 查看项目架构设计文档了解层级职责",
			].join("\n"),
			unknownLayer: [
				"⚠️ 无法确定文件的架构层级。",
				"",
				"📁 请确保文件位于正确的目录：",
				"  - src/views/ - UI 组件",
				"  - src/hooks/ - React hooks",
				"  - src/flows/ - 业务流程",
				"  - src/pipes/ - 纯函数",
				"  - src/io/ - IO 操作",
				"  - src/state/ - 状态管理",
				"  - src/utils/ - 工具函数",
				"  - src/types/ - 类型定义",
			].join("\n"),
		},
		schema: [],
		type: "problem",
	},
	name: "layer-dependencies",
})
