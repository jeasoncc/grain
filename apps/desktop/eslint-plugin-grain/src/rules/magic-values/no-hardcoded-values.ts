import type { TSESTree } from "@typescript-eslint/utils"
import { ESLintUtils } from "@typescript-eslint/utils"
import { buildErrorMessage } from "../../utils/message-builder"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`,
)

type MessageIds = "hardcodedUrl" | "hardcodedPath" | "hardcodedTimeout" | "hardcodedColor"
type Options = []

/**
 * 禁止硬编码值规则
 * 检测硬编码的 URL、路径、超时值、颜色值
 *
 * Validates: Requirements 23.2-23.5
 */
export default createRule<Options, MessageIds>({
	name: "no-hardcoded-values",
	meta: {
		type: "problem",
		docs: {
			description: "禁止硬编码 URL、路径、超时值等配置值",
		},
		messages: {
			hardcodedUrl: buildErrorMessage({
				title: "禁止硬编码 URL",
				reason: `
  硬编码的 URL 导致：
  - 环境切换困难（开发/测试/生产）
  - 无法集中管理 API 端点
  - 修改时需要查找所有出现的地方
  - 容易出现拼写错误`,
				correctExample: `// ✅ 使用配置文件
// config/api.config.ts
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL,
  ENDPOINTS: {
    USERS: '/api/users',
    POSTS: '/api/posts',
  },
} as const;

// 使用
fetch(\`\${API_CONFIG.BASE_URL}\${API_CONFIG.ENDPOINTS.USERS}\`);`,
				incorrectExample: `// ❌ 硬编码 URL
fetch('https://api.example.com/users');
fetch('http://localhost:3000/api/posts');`,
				docRef: "#code-standards - 配置管理",
			}),
			hardcodedPath: buildErrorMessage({
				title: "禁止硬编码文件路径",
				reason: `
  硬编码的路径导致：
  - 跨平台兼容性问题
  - 部署环境差异
  - 难以维护和修改`,
				correctExample: `// ✅ 使用配置或环境变量
import { join } from 'path';

const DATA_DIR = process.env.DATA_DIR || './data';
const configPath = join(DATA_DIR, 'config.json');`,
				incorrectExample: `// ❌ 硬编码路径
const configPath = '/home/user/app/config.json';
const dataPath = 'C:\\\\Users\\\\user\\\\data';`,
				docRef: "#code-standards - 路径管理",
			}),
			hardcodedTimeout: buildErrorMessage({
				title: "禁止硬编码超时值",
				reason: `
  硬编码的超时值导致：
  - 无法根据环境调整
  - 难以统一管理
  - 不同场景需要不同的超时时间`,
				correctExample: `// ✅ 使用命名常量
const NETWORK_TIMEOUT_MS = 30000;
const DEBOUNCE_DELAY_MS = 300;
const ANIMATION_DURATION_MS = 200;

setTimeout(callback, NETWORK_TIMEOUT_MS);
debounce(handler, DEBOUNCE_DELAY_MS);`,
				incorrectExample: `// ❌ 硬编码超时值
setTimeout(callback, 30000);
debounce(handler, 300);`,
				docRef: "#code-standards - 时间常量",
			}),
			hardcodedColor: buildErrorMessage({
				title: "禁止在非 CSS 文件中硬编码颜色值",
				reason: `
  硬编码的颜色值导致：
  - 主题切换困难
  - 设计系统不一致
  - 无法集中管理颜色`,
				correctExample: `// ✅ 使用 Tailwind 类名或 CSS 变量
<div className="bg-primary text-white" />

// 或使用主题配置
const theme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
  },
};`,
				incorrectExample: `// ❌ 硬编码颜色
<div style={{ backgroundColor: '#3b82f6' }} />
ctx.fillStyle = '#ff0000';`,
				docRef: "#code-standards - 主题管理",
			}),
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		/**
		 * 检查字符串是否为 URL
		 */
		function isUrl(str: string): boolean {
			return /^https?:\/\//.test(str) || /^wss?:\/\//.test(str)
		}

		/**
		 * 检查字符串是否为绝对路径
		 */
		function isAbsolutePath(str: string): boolean {
			// Unix 绝对路径
			if (str.startsWith("/")) return true
			// Windows 绝对路径
			if (/^[A-Za-z]:[/\\]/.test(str)) return true
			return false
		}

		/**
		 * 检查数字是否为超时值（通常是毫秒）
		 */
		function isTimeoutValue(node: TSESTree.Literal, parent: TSESTree.Node | undefined): boolean {
			if (!parent) return false

			// setTimeout, setInterval 的第二个参数
			if (
				parent.type === "CallExpression" &&
				parent.callee.type === "Identifier" &&
				(parent.callee.name === "setTimeout" || parent.callee.name === "setInterval")
			) {
				return parent.arguments[1] === node
			}

			// debounce, throttle 的第二个参数
			if (
				parent.type === "CallExpression" &&
				parent.callee.type === "Identifier" &&
				(parent.callee.name === "debounce" || parent.callee.name === "throttle")
			) {
				return parent.arguments[1] === node
			}

			// delay, sleep 等函数的参数
			if (
				parent.type === "CallExpression" &&
				parent.callee.type === "Identifier" &&
				/delay|sleep|wait|timeout/i.test(parent.callee.name)
			) {
				return true
			}

			return false
		}

		/**
		 * 检查字符串是否为颜色值
		 */
		function isColorValue(str: string): boolean {
			// 十六进制颜色
			if (/^#[0-9a-fA-F]{3,8}$/.test(str)) return true
			// rgb/rgba
			if (/^rgba?\(/.test(str)) return true
			// hsl/hsla
			if (/^hsla?\(/.test(str)) return true
			return false
		}

		/**
		 * 检查节点是否在 CSS 文件或样式相关上下文中
		 */
		function isInStyleContext(node: TSESTree.Node): boolean {
			const filename = context.getFilename()

			// CSS/SCSS/LESS 文件
			if (/\.(css|scss|less|sass)$/.test(filename)) {
				return true
			}

			// Tailwind 配置文件
			if (/tailwind\.config\.(ts|js)$/.test(filename)) {
				return true
			}

			// 主题配置文件
			if (/theme\.(ts|js)$/.test(filename)) {
				return true
			}

			return false
		}

		/**
		 * 检查节点是否在配置文件中
		 */
		function isInConfigFile(): boolean {
			const filename = context.getFilename()
			return /\.config\.(ts|js)$/.test(filename) || /config\//.test(filename)
		}

		/**
		 * 检查节点是否在常量声明中
		 */
		function isInConstantDeclaration(node: TSESTree.Node): boolean {
			const parent = node.parent
			if (!parent) return false

			// 检查是否在 VariableDeclarator 的初始化中
			if (
				parent.type === "VariableDeclarator" &&
				parent.init === node &&
				parent.id.type === "Identifier"
			) {
				const varName = parent.id.name
				// 检查是否为 SCREAMING_SNAKE_CASE
				return /^[A-Z][A-Z0-9_]*$/.test(varName)
			}

			return false
		}

		return {
			Literal(node: TSESTree.Literal) {
				// 跳过配置文件
				if (isInConfigFile()) {
					return
				}

				// 跳过常量声明
				if (isInConstantDeclaration(node)) {
					return
				}

				// 检查字符串字面量
				if (typeof node.value === "string") {
					const value = node.value

					// 检查 URL
					if (isUrl(value)) {
						context.report({
							node,
							messageId: "hardcodedUrl",
						})
						return
					}

					// 检查绝对路径
					if (isAbsolutePath(value)) {
						context.report({
							node,
							messageId: "hardcodedPath",
						})
						return
					}

					// 检查颜色值（非样式上下文）
					if (isColorValue(value) && !isInStyleContext(node)) {
						context.report({
							node,
							messageId: "hardcodedColor",
						})
						return
					}
				}

				// 检查数字字面量（超时值）
				if (typeof node.value === "number") {
					// 检查是否为超时值
					if (isTimeoutValue(node, node.parent)) {
						context.report({
							node,
							messageId: "hardcodedTimeout",
						})
					}
				}
			},

			// 检查模板字面量中的 URL
			TemplateLiteral(node: TSESTree.TemplateLiteral) {
				// 跳过配置文件
				if (isInConfigFile()) {
					return
				}

				// 跳过常量声明
				if (isInConstantDeclaration(node)) {
					return
				}

				// 检查是否包含 URL 模式
				const hasUrlPattern = node.quasis.some((quasi) => {
					return isUrl(quasi.value.raw)
				})

				if (hasUrlPattern) {
					context.report({
						node,
						messageId: "hardcodedUrl",
					})
				}
			},
		}
	},
})
