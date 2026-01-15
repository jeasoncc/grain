/**
 * ESLint Rule: no-store-in-views
 * 禁止在视图组件中直接访问 store
 *
 * view 组件 (.view.fn.tsx) 应该是纯展示组件，只接收 props
 * store 访问应该在 container 组件或 hooks 中进行
 *
 * @requirements 6.1, 27.1
 * @property Property 3: Architecture Layer Dependency Validation
 */

import type { TSESTree } from "@typescript-eslint/utils"
import { ESLintUtils } from "@typescript-eslint/utils"
import { getArchitectureLayer, isTestFile, isViewComponent } from "../../utils/architecture.js"

const createRule = ESLintUtils.RuleCreator((name) => `https://grain.dev/eslint-rules/${name}`)

type MessageIds = "noStoreInView" | "noUseStoreInView" | "noZustandInView" | "noStateImportInView"

/**
 * Zustand 相关的 hook 名称模式
 */
const ZUSTAND_HOOK_PATTERNS = [
	/^use.*Store$/, // useSettingsStore, useSelectionStore
	/^use.*State$/, // useAppState
	/Store$/, // 直接使用 store
]

/**
 * 状态管理相关的导入
 */
const STATE_MANAGEMENT_IMPORTS = [
	"zustand",
	"zustand/shallow",
	"zustand/middleware",
	"jotai",
	"recoil",
	"@/state",
]

/**
 * 检查是否为 Zustand store hook 调用
 */
function isZustandStoreCall(name: string): boolean {
	return ZUSTAND_HOOK_PATTERNS.some((pattern) => pattern.test(name))
}

export default createRule<[], MessageIds>({
	name: "no-store-in-views",
	meta: {
		type: "problem",
		docs: {
			description: "禁止在视图组件 (.view.fn.tsx) 中直接访问 store",
		},
		messages: {
			noStoreInView: `❌ 视图组件禁止直接访问 store

🔍 原因：
  视图组件 (.view.fn.tsx) 应该是纯展示组件，只接收 props。
  直接访问 store 会破坏组件的可测试性和可复用性。

🏗️ 架构原则：
  - view 组件：纯展示，只接收 props
  - container 组件：连接 store，传递数据给 view
  - hooks：封装 store 访问逻辑

✅ 修复方案：
  1. 将 store 访问移动到 container 组件
  2. 通过 props 传递数据给 view 组件
  3. 或者使用 hooks 封装 store 访问

📋 正确的数据流：
  state/ → hooks/ → container/ → view/ (via props)

📚 参考文档：#code-standards - 组件规范`,

			noUseStoreInView: `❌ 视图组件禁止使用 {{ hookName }}

🔍 原因：
  检测到在视图组件中使用了 store hook。
  视图组件应该是纯展示组件，不应直接访问状态。

✅ 修复方案：
  1. 将此组件改为 container 组件 (.container.fn.tsx)
  2. 或者将 store 访问移动到父组件，通过 props 传递

📚 参考文档：#architecture - 容器/视图分离`,

			noZustandInView: `❌ 视图组件禁止导入 Zustand

🔍 原因：
  视图组件不应直接依赖状态管理库。
  状态管理应该在 container 组件或 hooks 中处理。

✅ 修复方案：
  1. 移除 Zustand 导入
  2. 通过 props 接收所需数据
  3. 或者将组件改为 container 组件

📚 参考文档：#architecture - 状态层`,

			noStateImportInView: `❌ 视图组件禁止从 state/ 层导入

🔍 原因：
  视图组件 (.view.fn.tsx) 不能直接依赖 state/ 层。
  这违反了架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks/, types/
  
✅ 修复方案：
  1. 通过 hooks/ 间接访问状态
  2. 或者将组件改为 container 组件

📚 参考文档：#architecture - 依赖规则`,
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const filename = context.filename

		// 如果没有文件名，跳过检查
		if (!filename) {
			return {}
		}

		// 跳过测试文件
		if (isTestFile(filename)) {
			return {}
		}

		// 只检查 views/ 层的 .view.fn.tsx 文件
		const currentLayer = getArchitectureLayer(filename)
		if (currentLayer !== "views") {
			return {}
		}

		// 只检查视图组件，不检查容器组件
		if (!isViewComponent(filename)) {
			return {}
		}

		return {
			// 检查导入语句
			ImportDeclaration(node: TSESTree.ImportDeclaration) {
				const importPath = node.source.value

				// 检查 Zustand 导入
				if (importPath === "zustand" || importPath.startsWith("zustand/")) {
					context.report({
						node,
						messageId: "noZustandInView",
					})
					return
				}

				// 检查其他状态管理库导入
				if (
					importPath === "jotai" ||
					importPath.startsWith("jotai/") ||
					importPath === "recoil" ||
					importPath.startsWith("recoil/")
				) {
					context.report({
						node,
						messageId: "noZustandInView",
					})
					return
				}

				// 检查从 state/ 层导入
				if (importPath.startsWith("@/state")) {
					context.report({
						node,
						messageId: "noStateImportInView",
					})
					return
				}

				// 检查相对路径导入 state
				if (importPath.includes("/state/") || importPath.endsWith(".state")) {
					context.report({
						node,
						messageId: "noStateImportInView",
					})
				}
			},

			// 检查函数调用
			CallExpression(node: TSESTree.CallExpression) {
				// 检查直接调用 store hook
				if (node.callee.type === "Identifier") {
					const name = node.callee.name

					if (isZustandStoreCall(name)) {
						context.report({
							node,
							messageId: "noUseStoreInView",
							data: { hookName: name },
						})
					}
				}

				// 检查成员表达式调用 (如 store.getState())
				if (node.callee.type === "MemberExpression" && node.callee.object.type === "Identifier") {
					const objectName = node.callee.object.name
					const propertyName =
						node.callee.property.type === "Identifier" ? node.callee.property.name : ""

					// 检查 store.getState() 或 store.setState()
					if (
						objectName.toLowerCase().includes("store") &&
						(propertyName === "getState" ||
							propertyName === "setState" ||
							propertyName === "subscribe")
					) {
						context.report({
							node,
							messageId: "noStoreInView",
						})
					}
				}
			},

			// 检查变量声明中的 store 解构
			VariableDeclarator(node: TSESTree.VariableDeclarator) {
				// 检查从 store hook 解构
				if (node.init?.type === "CallExpression" && node.init.callee.type === "Identifier") {
					const hookName = node.init.callee.name

					if (isZustandStoreCall(hookName)) {
						context.report({
							node,
							messageId: "noUseStoreInView",
							data: { hookName },
						})
					}
				}
			},
		}
	},
})
