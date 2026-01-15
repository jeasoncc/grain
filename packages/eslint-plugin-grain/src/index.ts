/**
 * ESLint Plugin for Grain Functional Programming Architecture
 *
 * This plugin enforces functional programming patterns and architectural
 * layer separation as defined in the Grain project's steering files.
 *
 * @version 2.0.0
 * @description 最严格的代码审查系统，包含 50+ 条规则
 *
 * 配置预设：
 * - strict: 最严格配置（推荐，所有规则为 error）
 * - legacy: 迁移配置（仅用于从旧代码库迁移）
 * - recommended: 平衡配置（部分规则为 warn）
 *
 * 使用方法：
 * ```js
 * // eslint.config.js
 * import grainPlugin from 'eslint-plugin-grain';
 *
 * export default [
 *   {
 *     plugins: { grain: grainPlugin },
 *     rules: grainPlugin.configs.strict.rules, // 推荐使用 strict
 *   }
 * ];
 * ```
 */

import { ESLintUtils } from "@typescript-eslint/utils"
import { legacyConfig } from "./configs/legacy.js"
// Import configuration presets
import { strictConfig } from "./configs/strict.js"
// Import new architecture rules
import {
	fileLocation,
	layerDependencies,
	noReactInPureLayers as noReactInPureLayersNew,
	noSideEffectsInPipes as noSideEffectsInPipesNew,
	noStoreInViews,
} from "./rules/architecture/index.js"
// Import complexity rules
import {
	cyclomaticComplexity,
	maxFileLines,
	maxFunctionLines,
	maxNesting,
	maxParams,
} from "./rules/complexity/index.js"
// Import conditional rules
import { noNestedTernary, requireSwitchDefault, strictEquality } from "./rules/conditional/index.js"
// Import documentation rules
import { chineseComments, noCommentedCode, requireJsdoc } from "./rules/documentation/index.js"
// Import new functional programming rules
import {
	fpTsPatterns,
	noAsyncOutsideIo,
	noMutation,
	noObjectMutation,
	noPromiseMethods,
	noThrow,
	noTryCatch,
} from "./rules/functional/index.js"
// Import import rules
import importRules from "./rules/imports/index.js"
import layerDependenciesLegacy from "./rules/layer-dependencies.js"
// Import magic-values rules
import { noHardcodedValues, noMagicNumbers } from "./rules/magic-values/index.js"
// Import naming rules
import {
	booleanNaming,
	constantNaming,
	fileNaming,
	functionNaming,
	variableNaming,
} from "./rules/naming/index.js"
import noConsoleLog from "./rules/no-console-log.js"
import noDateConstructor from "./rules/no-date-constructor.js"
import noLodash from "./rules/no-lodash.js"
import noMutationLegacy from "./rules/no-mutation.js"
import noReactInPureLayers from "./rules/no-react-in-pure-layers.js"
import noSideEffectsInPipes from "./rules/no-side-effects-in-pipes.js"
// Import legacy rule modules (to be migrated)
import noTryCatchLegacy from "./rules/no-try-catch.js"
// Import React rules
import reactRules from "./rules/react/index.js"
// Import security rules
import { noEval, noInnerhtml, noSensitiveLogging } from "./rules/security/index.js"

// Import type-safety rules
import { noAny, noNonNullAssertion, requireReturnType } from "./rules/type-safety/index.js"

// Import zustand rules
import zustandRules from "./rules/zustand/index.js"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`,
)

// Plugin configuration
const plugin = {
	// Predefined configurations
	configs: {
		/**
		 * Legacy Configuration (仅用于迁移)
		 *
		 * 用于从旧代码库迁移到新架构的宽松配置
		 *
		 * ⚠️ 警告：
		 * - 不应在新项目中使用
		 * - 应尽快迁移到 strict 配置
		 * - 此配置将在未来版本中被移除
		 *
		 * 适用场景：
		 * - 正在迁移的旧项目
		 * - 需要渐进式采用新规则的项目
		 */
		legacy: legacyConfig,

		/**
		 * Recommended Configuration (平衡配置)
		 *
		 * 平衡严格性和实用性的配置
		 * 核心规则为 error，次要规则为 warn
		 *
		 * 适用场景：
		 * - 中等规模项目
		 * - 需要一定灵活性的项目
		 */
		recommended: {
			plugins: ["grain"],
			rules: {
				"grain/boolean-naming": "error",
				"grain/chinese-comments": "warn",
				"grain/component-patterns": "error",
				"grain/constant-naming": "error",
				"grain/cyclomatic-complexity": "error",
				"grain/file-location": "warn",
				// Naming Rules
				"grain/file-naming": "warn",
				"grain/fp-ts-patterns": "error",
				"grain/function-naming": "warn",
				"grain/hooks-patterns": "error",
				"grain/import-grouping": "warn",
				// Architecture Rules
				"grain/layer-dependencies": "error",
				"grain/max-file-lines": "error",
				// Complexity Rules
				"grain/max-function-lines": "error",
				"grain/max-nesting": "error",
				"grain/max-params": "error",
				// Type Safety Rules
				"grain/no-any": "error",
				"grain/no-async-outside-io": "error",
				"grain/no-banned-imports": "error",
				"grain/no-commented-code": "error",
				// Import Rules
				"grain/no-default-export": "error",
				"grain/no-deprecated-imports": "error",
				// Security Rules
				"grain/no-eval": "error",
				"grain/no-hardcoded-values": "error",
				"grain/no-inline-functions": "error",
				"grain/no-innerhtml": "error",
				// Magic Values Rules
				"grain/no-magic-numbers": "error",
				"grain/no-mutation": "error",
				// Conditional Rules
				"grain/no-nested-ternary": "error",
				"grain/no-non-null-assertion": "error",
				"grain/no-object-mutation": "error",
				"grain/no-promise-methods": "error",
				"grain/no-react-in-pure-layers": "error",
				"grain/no-sensitive-logging": "error",
				"grain/no-side-effects-in-pipes": "error",
				"grain/no-store-in-views": "error",
				"grain/no-throw": "error",
				// Functional Programming Rules
				"grain/no-try-catch": "error",
				"grain/require-alias": "error",
				"grain/require-callback": "error",
				// Documentation Rules
				"grain/require-jsdoc": "error",
				// React Rules
				"grain/require-memo": "warn",
				"grain/require-return-type": "warn",
				"grain/require-switch-default": "error",
				"grain/strict-equality": "error",
				"grain/variable-naming": "error",
				// Zustand Rules
				"grain/zustand-patterns": "error",
			},
		},
		/**
		 * Strict Configuration (推荐)
		 *
		 * 最严格的代码审查配置，所有规则设为 error 级别
		 * 这是 Grain 项目的默认和唯一推荐配置
		 *
		 * 适用场景：
		 * - 新项目
		 * - 已完成迁移的项目
		 * - 追求最高代码质量的项目
		 */
		strict: strictConfig,
	},
	meta: {
		description: "最严格的代码审查系统 - Grain 函数式编程架构",
		name: "eslint-plugin-grain",
		version: "2.0.0",
	},

	// All implemented rules
	rules: {
		"boolean-naming": booleanNaming,
		"chinese-comments": chineseComments,
		"component-patterns": reactRules["component-patterns"],
		"constant-naming": constantNaming,
		"cyclomatic-complexity": cyclomaticComplexity,
		"file-location": fileLocation,

		// ============================================
		// Naming Convention Rules
		// ============================================
		"file-naming": fileNaming,
		"fp-ts-patterns": fpTsPatterns,
		"function-naming": functionNaming,
		"hooks-patterns": reactRules["hooks-patterns"],
		"import-grouping": importRules["import-grouping"],

		// ============================================
		// Architecture Layer Rules (Enhanced)
		// ============================================
		"layer-dependencies": layerDependencies,
		"layer-dependencies-legacy": layerDependenciesLegacy,
		"max-file-lines": maxFileLines,

		// ============================================
		// Complexity Rules
		// ============================================
		"max-function-lines": maxFunctionLines,
		"max-nesting": maxNesting,
		"max-params": maxParams,

		// ============================================
		// Type Safety Rules
		// ============================================
		"no-any": noAny,
		"no-async-outside-io": noAsyncOutsideIo,
		"no-banned-imports": importRules["no-banned-imports"],
		"no-commented-code": noCommentedCode,
		"no-console-log": noConsoleLog,
		"no-date-constructor": noDateConstructor,

		// ============================================
		// Import Organization Rules
		// ============================================
		"no-default-export": importRules["no-default-export"],
		"no-deprecated-imports": importRules["no-deprecated-imports"],

		// ============================================
		// Security Rules
		// ============================================
		"no-eval": noEval,
		"no-hardcoded-values": noHardcodedValues,
		"no-inline-functions": reactRules["no-inline-functions"],
		"no-innerhtml": noInnerhtml,
		"no-lodash": noLodash,

		// ============================================
		// Magic Values Rules
		// ============================================
		"no-magic-numbers": noMagicNumbers,
		"no-mutation": noMutation,
		"no-mutation-legacy": noMutationLegacy,

		// ============================================
		// Conditional Statement Rules
		// ============================================
		"no-nested-ternary": noNestedTernary,
		"no-non-null-assertion": noNonNullAssertion,
		"no-object-mutation": noObjectMutation,
		"no-promise-methods": noPromiseMethods,
		"no-react-in-pure-layers": noReactInPureLayersNew,
		"no-sensitive-logging": noSensitiveLogging,
		"no-side-effects-in-pipes": noSideEffectsInPipesNew,
		"no-store-in-views": noStoreInViews,
		"no-throw": noThrow,
		// ============================================
		// Functional Programming Rules (Enhanced)
		// ============================================
		"no-try-catch": noTryCatch,

		// ============================================
		// Legacy Rules (Deprecated - for backward compatibility)
		// ============================================
		"no-try-catch-legacy": noTryCatchLegacy,
		"require-alias": importRules["require-alias"],
		"require-callback": reactRules["require-callback"],

		// ============================================
		// Documentation Rules
		// ============================================
		"require-jsdoc": requireJsdoc,

		// ============================================
		// React Component Rules
		// ============================================
		"require-memo": reactRules["require-memo"],
		"require-return-type": requireReturnType,
		"require-switch-default": requireSwitchDefault,
		"strict-equality": strictEquality,
		"variable-naming": variableNaming,

		// ============================================
		// Zustand State Management Rules
		// ============================================
		"zustand-patterns": zustandRules["zustand-patterns"],
	},
}

export default plugin

// Export utilities for rule development
export { createRule }
export type { ESLintUtils }

export { legacyConfig } from "./configs/legacy.js"
// Export configuration presets for direct import
export { strictConfig } from "./configs/strict.js"
export * from "./rules/architecture/index.js"
export * from "./rules/complexity/index.js"
export * from "./rules/conditional/index.js"
export * from "./rules/documentation/index.js"
// Export all rule categories for advanced usage
export * from "./rules/functional/index.js"
export * from "./rules/magic-values/index.js"
export * from "./rules/naming/index.js"
export * from "./rules/security/index.js"
export * from "./rules/type-safety/index.js"
export * from "./types/config.types.js"
// Export types for TypeScript users
export * from "./types/rule.types.js"
// Export utility functions for custom rule development
export * from "./utils/architecture.js"
export * from "./utils/ast-helpers.js"
export * from "./utils/message-builder.js"
export * from "./utils/naming-helpers.js"
