/**
 * @fileoverview Rule to enforce @/ alias for internal imports
 * @author Grain Team
 */

import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils"
import * as path from "path"
import { buildErrorMessage } from "../../utils/message-builder.js"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`,
)

export default createRule({
	create(context) {
		return {
			ImportDeclaration(node: TSESTree.ImportDeclaration) {
				const source = node.source.value

				if (typeof source !== "string") return

				// Skip external modules
				if (!source.startsWith(".")) return

				// Get the current file path
				const filename = context.filename || context.getFilename()

				// Skip if not in src directory
				if (!filename.includes("/src/")) return

				// Check if this is an internal import (goes up to src or beyond)
				const resolvedPath = path.resolve(path.dirname(filename), source)
				const srcIndex = filename.lastIndexOf("/src/")
				const srcPath = filename.substring(0, srcIndex + 5) // Include '/src/'

				// If the resolved path is within src, it should use @/ alias
				if (resolvedPath.startsWith(srcPath)) {
					// Calculate what the @/ import should be
					const relativePath = resolvedPath.substring(srcPath.length)
					const aliasPath = `@/${relativePath}`

					context.report({
						fix(fixer) {
							// Remove file extension if present
							const cleanPath = aliasPath.replace(/\.(ts|tsx|js|jsx)$/, "")
							return fixer.replaceText(node.source, `'${cleanPath}'`)
						},
						messageId: "requireAlias",
						node: node.source,
					})
				}
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "强制内部导入使用 @/ 别名",
		},
		fixable: "code",
		messages: {
			requireAlias: buildErrorMessage({
				correctExample: `// ✅ 使用 @/ 别名
import { MyComponent } from '@/views/my-component';
import { useWorkspace } from '@/hooks/use-workspace';
import { createNode } from '@/flows/node/create-node.flow';`,
				docRef: "#code-standards - 导入规范",
				incorrectExample: `// ❌ 不要使用相对路径
import { MyComponent } from '../../views/my-component';
import { useWorkspace } from '../hooks/use-workspace';
import { createNode } from './flows/node/create-node.flow';`,
				reason: `
  相对路径导入存在以下问题：
  - 文件移动时需要更新所有导入路径
  - 深层嵌套的相对路径难以理解（../../..）
  - 不利于代码重构
  - @/ 别名提供了统一的导入方式`,
				title: "内部导入必须使用 @/ 别名",
			}),
		},
		schema: [],
		type: "problem",
	},
	name: "require-alias",
})
