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

import { ESLintUtils } from '@typescript-eslint/utils';

// Import configuration presets
import { strictConfig } from './configs/strict.js';
import { legacyConfig } from './configs/legacy.js';

// Import legacy rule modules (to be migrated)
import noTryCatchLegacy from './rules/no-try-catch.js';
import noConsoleLog from './rules/no-console-log.js';
import noDateConstructor from './rules/no-date-constructor.js';
import noLodash from './rules/no-lodash.js';
import noMutationLegacy from './rules/no-mutation.js';
import layerDependenciesLegacy from './rules/layer-dependencies.js';
import noReactInPureLayers from './rules/no-react-in-pure-layers.js';
import noSideEffectsInPipes from './rules/no-side-effects-in-pipes.js';

// Import new functional programming rules
import {
  noTryCatch,
  noThrow,
  noPromiseMethods,
  noAsyncOutsideIo,
  noMutation,
  noObjectMutation,
  fpTsPatterns,
} from './rules/functional/index.js';

// Import new architecture rules
import { 
  layerDependencies,
  noReactInPureLayers as noReactInPureLayersNew,
  noSideEffectsInPipes as noSideEffectsInPipesNew,
  noStoreInViews,
  fileLocation,
} from './rules/architecture/index.js';

// Import naming rules
import {
  fileNaming,
  variableNaming,
  functionNaming,
  booleanNaming,
  constantNaming,
} from './rules/naming/index.js';

// Import complexity rules
import {
  maxFunctionLines,
  maxParams,
  maxNesting,
  cyclomaticComplexity,
  maxFileLines,
} from './rules/complexity/index.js';

// Import React rules
import reactRules from './rules/react/index.js';

// Import import rules
import importRules from './rules/imports/index.js';

// Import security rules
import {
  noEval,
  noInnerhtml,
  noSensitiveLogging,
} from './rules/security/index.js';

// Import documentation rules
import {
  requireJsdoc,
  noCommentedCode,
  chineseComments,
} from './rules/documentation/index.js';

// Import magic-values rules
import {
  noMagicNumbers,
  noHardcodedValues,
} from './rules/magic-values/index.js';

// Import conditional rules
import {
  noNestedTernary,
  strictEquality,
  requireSwitchDefault,
} from './rules/conditional/index.js';

// Import type-safety rules
import {
  noAny,
  noNonNullAssertion,
  requireReturnType,
} from './rules/type-safety/index.js';

// Import zustand rules
import zustandRules from './rules/zustand/index.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`
);

// Plugin configuration
const plugin = {
  meta: {
    name: 'eslint-plugin-grain',
    version: '2.0.0',
    description: '最严格的代码审查系统 - Grain 函数式编程架构',
  },
  
  // All implemented rules
  rules: {
    // ============================================
    // Functional Programming Rules (Enhanced)
    // ============================================
    'no-try-catch': noTryCatch,
    'no-throw': noThrow,
    'no-promise-methods': noPromiseMethods,
    'no-async-outside-io': noAsyncOutsideIo,
    'no-mutation': noMutation,
    'no-object-mutation': noObjectMutation,
    'fp-ts-patterns': fpTsPatterns,
    
    // ============================================
    // Architecture Layer Rules (Enhanced)
    // ============================================
    'layer-dependencies': layerDependencies,
    'no-react-in-pure-layers': noReactInPureLayersNew,
    'no-side-effects-in-pipes': noSideEffectsInPipesNew,
    'no-store-in-views': noStoreInViews,
    'file-location': fileLocation,
    
    // ============================================
    // Naming Convention Rules
    // ============================================
    'file-naming': fileNaming,
    'variable-naming': variableNaming,
    'function-naming': functionNaming,
    'boolean-naming': booleanNaming,
    'constant-naming': constantNaming,
    
    // ============================================
    // Complexity Rules
    // ============================================
    'max-function-lines': maxFunctionLines,
    'max-params': maxParams,
    'max-nesting': maxNesting,
    'cyclomatic-complexity': cyclomaticComplexity,
    'max-file-lines': maxFileLines,
    
    // ============================================
    // React Component Rules
    // ============================================
    'require-memo': reactRules['require-memo'],
    'no-inline-functions': reactRules['no-inline-functions'],
    'require-callback': reactRules['require-callback'],
    'hooks-patterns': reactRules['hooks-patterns'],
    'component-patterns': reactRules['component-patterns'],
    
    // ============================================
    // Import Organization Rules
    // ============================================
    'no-default-export': importRules['no-default-export'],
    'no-banned-imports': importRules['no-banned-imports'],
    'require-alias': importRules['require-alias'],
    'import-grouping': importRules['import-grouping'],
    'no-deprecated-imports': importRules['no-deprecated-imports'],
    
    // ============================================
    // Security Rules
    // ============================================
    'no-eval': noEval,
    'no-innerhtml': noInnerhtml,
    'no-sensitive-logging': noSensitiveLogging,
    
    // ============================================
    // Documentation Rules
    // ============================================
    'require-jsdoc': requireJsdoc,
    'no-commented-code': noCommentedCode,
    'chinese-comments': chineseComments,
    
    // ============================================
    // Magic Values Rules
    // ============================================
    'no-magic-numbers': noMagicNumbers,
    'no-hardcoded-values': noHardcodedValues,
    
    // ============================================
    // Conditional Statement Rules
    // ============================================
    'no-nested-ternary': noNestedTernary,
    'strict-equality': strictEquality,
    'require-switch-default': requireSwitchDefault,
    
    // ============================================
    // Type Safety Rules
    // ============================================
    'no-any': noAny,
    'no-non-null-assertion': noNonNullAssertion,
    'require-return-type': requireReturnType,
    
    // ============================================
    // Zustand State Management Rules
    // ============================================
    'zustand-patterns': zustandRules['zustand-patterns'],
    
    // ============================================
    // Legacy Rules (Deprecated - for backward compatibility)
    // ============================================
    'no-try-catch-legacy': noTryCatchLegacy,
    'no-mutation-legacy': noMutationLegacy,
    'no-console-log': noConsoleLog,
    'no-date-constructor': noDateConstructor,
    'no-lodash': noLodash,
    'layer-dependencies-legacy': layerDependenciesLegacy,
  },
  
  // Predefined configurations
  configs: {
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
      plugins: ['grain'],
      rules: {
        // Functional Programming Rules
        'grain/no-try-catch': 'error',
        'grain/no-throw': 'error',
        'grain/no-promise-methods': 'error',
        'grain/no-async-outside-io': 'error',
        'grain/no-mutation': 'error',
        'grain/no-object-mutation': 'error',
        'grain/fp-ts-patterns': 'error',
        // Architecture Rules
        'grain/layer-dependencies': 'error',
        'grain/no-react-in-pure-layers': 'error',
        'grain/no-side-effects-in-pipes': 'error',
        'grain/no-store-in-views': 'error',
        'grain/file-location': 'warn',
        // Naming Rules
        'grain/file-naming': 'warn',
        'grain/variable-naming': 'error',
        'grain/function-naming': 'warn',
        'grain/boolean-naming': 'error',
        'grain/constant-naming': 'error',
        // Complexity Rules
        'grain/max-function-lines': 'error',
        'grain/max-params': 'error',
        'grain/max-nesting': 'error',
        'grain/cyclomatic-complexity': 'error',
        'grain/max-file-lines': 'error',
        // React Rules
        'grain/require-memo': 'warn',
        'grain/no-inline-functions': 'error',
        'grain/require-callback': 'error',
        'grain/hooks-patterns': 'error',
        'grain/component-patterns': 'error',
        // Import Rules
        'grain/no-default-export': 'error',
        'grain/no-banned-imports': 'error',
        'grain/require-alias': 'error',
        'grain/import-grouping': 'warn',
        'grain/no-deprecated-imports': 'error',
        // Security Rules
        'grain/no-eval': 'error',
        'grain/no-innerhtml': 'error',
        'grain/no-sensitive-logging': 'error',
        // Documentation Rules
        'grain/require-jsdoc': 'error',
        'grain/no-commented-code': 'error',
        'grain/chinese-comments': 'warn',
        // Magic Values Rules
        'grain/no-magic-numbers': 'error',
        'grain/no-hardcoded-values': 'error',
        // Conditional Rules
        'grain/no-nested-ternary': 'error',
        'grain/strict-equality': 'error',
        'grain/require-switch-default': 'error',
        // Type Safety Rules
        'grain/no-any': 'error',
        'grain/no-non-null-assertion': 'error',
        'grain/require-return-type': 'warn',
        // Zustand Rules
        'grain/zustand-patterns': 'error',
      },
    },
  },
};

export default plugin;

// Export utilities for rule development
export { createRule };
export type { ESLintUtils };

// Export configuration presets for direct import
export { strictConfig } from './configs/strict.js';
export { legacyConfig } from './configs/legacy.js';

// Export all rule categories for advanced usage
export * from './rules/functional/index.js';
export * from './rules/architecture/index.js';
export * from './rules/naming/index.js';
export * from './rules/complexity/index.js';
export * from './rules/security/index.js';
export * from './rules/documentation/index.js';
export * from './rules/magic-values/index.js';
export * from './rules/conditional/index.js';
export * from './rules/type-safety/index.js';

// Export utility functions for custom rule development
export * from './utils/architecture.js';
export * from './utils/message-builder.js';
export * from './utils/ast-helpers.js';
export * from './utils/naming-helpers.js';

// Export types for TypeScript users
export * from './types/rule.types.js';
export * from './types/config.types.js';