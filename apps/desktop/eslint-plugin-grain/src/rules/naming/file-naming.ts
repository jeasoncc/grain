import { ESLintUtils } from "@typescript-eslint/utils"
import { FILE_NAMING_PATTERNS } from "../../types/config.types"
import { getArchitectureLayer } from "../../utils/architecture"
import { buildErrorMessage } from "../../utils/message-builder"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`,
)

export default createRule({
	create(context) {
		const filename = context.getFilename()

		// 跳过测试文件
		if (/\.(test|spec)\.(ts|tsx)$/.test(filename)) {
			return {}
		}

		return {
			Program(node) {
				const layer = getArchitectureLayer(filename)
				if (!layer) return

				const pattern = FILE_NAMING_PATTERNS.find((p) => p.layer === layer)
				if (!pattern) return

				const basename = filename.split("/").pop() || ""

				if (!pattern.pattern.test(basename)) {
					context.report({
						data: {
							basename,
							description: pattern.description,
							example: pattern.example,
							layer,
						},
						messageId: "invalidFileName",
						node,
					})
				}
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "强制执行各层级的文件命名规范",
		},
		messages: {
			invalidFileName: "文件命名不符合规范",
		},
		schema: [],
		type: "problem",
	},
	name: "file-naming",
})
