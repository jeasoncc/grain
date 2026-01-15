/**
 * @fileoverview Rule to prohibit banned library imports
 * @author Grain Team
 */

import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils"
import { BANNED_LIBRARIES } from "../../types/config.types.js"
import { buildErrorMessage } from "../../utils/message-builder.js"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`,
)

export default createRule({
	create(context) {
		return {
			// Check for require() calls
			CallExpression(node: TSESTree.CallExpression) {
				if (
					node.callee.type === "Identifier" &&
					node.callee.name === "require" &&
					node.arguments.length > 0 &&
					node.arguments[0].type === "Literal" &&
					typeof node.arguments[0].value === "string"
				) {
					const source = node.arguments[0].value

					// Check for lodash requires
					if (
						source === "lodash" ||
						source === "lodash-es" ||
						source === "underscore" ||
						source.startsWith("lodash/")
					) {
						context.report({
							messageId: "noLodash",
							node,
						})
						return
					}

					// Check for moment requires
					if (source === "moment" || source === "moment-timezone" || source.startsWith("moment/")) {
						context.report({
							messageId: "noMoment",
							node,
						})
						return
					}

					// Check for other banned libraries
					if (source in BANNED_LIBRARIES) {
						context.report({
							data: {
								alternative: BANNED_LIBRARIES[source],
								moduleName: source,
							},
							messageId: "noBannedLibrary",
							node,
						})
					}
				}
			},
			ImportDeclaration(node: TSESTree.ImportDeclaration) {
				const source = node.source.value

				if (typeof source !== "string") return

				// Check for lodash imports
				if (
					source === "lodash" ||
					source === "lodash-es" ||
					source === "underscore" ||
					source.startsWith("lodash/")
				) {
					context.report({
						messageId: "noLodash",
						node,
					})
					return
				}

				// Check for moment imports
				if (source === "moment" || source === "moment-timezone" || source.startsWith("moment/")) {
					context.report({
						messageId: "noMoment",
						node,
					})
					return
				}

				// Check for other banned libraries
				if (source in BANNED_LIBRARIES) {
					context.report({
						data: {
							alternative: BANNED_LIBRARIES[source],
							moduleName: source,
						},
						messageId: "noBannedLibrary",
						node,
					})
				}
			},

			MemberExpression(node: TSESTree.MemberExpression) {
				if (
					node.object.type === "Identifier" &&
					node.object.name === "Date" &&
					node.property.type === "Identifier" &&
					node.property.name === "now"
				) {
					context.report({
						messageId: "noDateConstructor",
						node,
					})
				}
			},

			// Check for new Date() and Date.now()
			NewExpression(node: TSESTree.NewExpression) {
				if (node.callee.type === "Identifier" && node.callee.name === "Date") {
					context.report({
						messageId: "noDateConstructor",
						node,
					})
				}
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "禁止使用已废弃的库，强制使用现代替代方案",
		},
		fixable: undefined,
		messages: {
			noBannedLibrary: `❌ 禁止使用已废弃的模块 "{{moduleName}}"

🔍 原因：
  该库已被更好的替代方案取代

✅ 推荐替代方案：
  {{alternative}}

📚 参考文档：#code-standards - 禁止使用的库`,
			noDateConstructor: buildErrorMessage({
				correctExample: `// ✅ 使用 dayjs
import dayjs from 'dayjs';

const now = dayjs();
const timestamp = dayjs().valueOf();
const formatted = dayjs().format('YYYY-MM-DD HH:mm:ss');`,
				docRef: "#code-standards - 禁止使用的库",
				incorrectExample: `// ❌ 不要使用 Date
const now = new Date();
const timestamp = Date.now();`,
				reason: `
  原生 Date API 存在以下问题：
  - 时区处理复杂
  - API 不一致
  - 难以测试
  - dayjs 提供了更好的 API`,
				title: "禁止使用 new Date() 和 Date.now()",
			}),
			noLodash: buildErrorMessage({
				correctExample: `// ✅ 使用 es-toolkit
import { debounce, throttle, cloneDeep } from 'es-toolkit';

const debouncedFn = debounce(fn, 300);
const cloned = cloneDeep(obj);`,
				docRef: "#code-standards - 禁止使用的库",
				incorrectExample: `// ❌ 不要使用 lodash
import _ from 'lodash';
import debounce from 'lodash/debounce';

const debouncedFn = _.debounce(fn, 300);`,
				reason: `
  lodash 是一个过时的工具库：
  - 体积大，不利于 tree-shaking
  - 性能不如现代原生方法
  - es-toolkit 提供了更好的替代方案`,
				title: "禁止使用 lodash",
			}),
			noMoment: buildErrorMessage({
				correctExample: `// ✅ 使用 dayjs
import dayjs from 'dayjs';

const formatted = dayjs().format('YYYY-MM-DD');
const diff = dayjs(date1).diff(date2, 'day');`,
				docRef: "#code-standards - 禁止使用的库",
				incorrectExample: `// ❌ 不要使用 moment
import moment from 'moment';

const formatted = moment().format('YYYY-MM-DD');`,
				reason: `
  moment 已经停止维护：
  - 体积过大（200KB+）
  - 不支持 tree-shaking
  - dayjs 提供了相同的 API，体积只有 2KB`,
				title: "禁止使用 moment",
			}),
		},
		schema: [],
		type: "problem",
	},
	name: "no-banned-imports",
})
