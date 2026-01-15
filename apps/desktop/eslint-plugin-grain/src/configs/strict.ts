/**
 * Strict Configuration Preset
 *
 * 最严格的代码审查配置，所有规则设为 error 级别
 * 这是 Grain 项目的默认和唯一推荐配置
 *
 * 设计原则：零容忍
 * - 所有规则默认为 error 级别
 * - 任何违规都将阻塞提交
 * - 宁可误报，不可漏报
 * - 强制执行所有 steering 文件中的规范
 *
 * Requirements: 14.1-14.4
 */

export const strictConfig = {
	plugins: ["grain"],
	rules: {
		"grain/boolean-naming": "error",
		"grain/chinese-comments": "error",
		"grain/component-patterns": "error",
		"grain/constant-naming": "error",
		"grain/cyclomatic-complexity": "error",
		"grain/file-location": "error",

		// ============================================
		// Naming Convention Rules - All error
		// ============================================
		"grain/file-naming": "error",
		"grain/fp-ts-patterns": "error",
		"grain/function-naming": "error",
		"grain/hooks-patterns": "error",
		"grain/import-grouping": "error",

		// ============================================
		// Architecture Layer Rules - All error
		// ============================================
		"grain/layer-dependencies": "error",
		"grain/max-file-lines": "error",

		// ============================================
		// Complexity Rules - All error
		// ============================================
		"grain/max-function-lines": "error",
		"grain/max-nesting": "error",
		"grain/max-params": "error",

		// ============================================
		// Type Safety Rules - All error
		// ============================================
		"grain/no-any": "error",
		"grain/no-async-outside-io": "error",
		"grain/no-banned-imports": "error",
		"grain/no-commented-code": "error",

		// ============================================
		// Import Organization Rules - All error
		// ============================================
		"grain/no-default-export": "error",
		"grain/no-deprecated-imports": "error",

		// ============================================
		// Security Rules - All error
		// ============================================
		"grain/no-eval": "error",
		"grain/no-hardcoded-values": "error",
		"grain/no-inline-functions": "error",
		"grain/no-innerhtml": "error",

		// ============================================
		// Magic Values Rules - All error
		// ============================================
		"grain/no-magic-numbers": "error",
		"grain/no-mutation": "error",

		// ============================================
		// Conditional Statement Rules - All error
		// ============================================
		"grain/no-nested-ternary": "error",
		"grain/no-non-null-assertion": "error",
		"grain/no-object-mutation": "error",
		"grain/no-promise-methods": "error",
		"grain/no-react-in-pure-layers": "error",
		"grain/no-sensitive-logging": "error",
		"grain/no-side-effects-in-pipes": "error",
		"grain/no-store-in-views": "error",
		"grain/no-throw": "error",
		// ============================================
		// Functional Programming Rules - All error
		// ============================================
		"grain/no-try-catch": "error",
		"grain/require-alias": "error",
		"grain/require-callback": "error",

		// ============================================
		// Documentation Rules - All error
		// ============================================
		"grain/require-jsdoc": "error",

		// ============================================
		// React Component Rules - All error
		// ============================================
		"grain/require-memo": "error",
		"grain/require-return-type": "error",
		"grain/require-switch-default": "error",
		"grain/strict-equality": "error",
		"grain/variable-naming": "error",

		// ============================================
		// Zustand State Management Rules - All error
		// ============================================
		"grain/zustand-patterns": "error",
	},
} as const
