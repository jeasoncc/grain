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
  plugins: ['grain'],
  rules: {
    // ============================================
    // Functional Programming Rules - All error
    // ============================================
    'grain/no-try-catch': 'error',
    'grain/no-throw': 'error',
    'grain/no-promise-methods': 'error',
    'grain/no-async-outside-io': 'error',
    'grain/no-mutation': 'error',
    'grain/no-object-mutation': 'error',
    'grain/fp-ts-patterns': 'error',
    
    // ============================================
    // Architecture Layer Rules - All error
    // ============================================
    'grain/layer-dependencies': 'error',
    'grain/no-react-in-pure-layers': 'error',
    'grain/no-side-effects-in-pipes': 'error',
    'grain/no-store-in-views': 'error',
    'grain/file-location': 'error',
    
    // ============================================
    // Naming Convention Rules - All error
    // ============================================
    'grain/file-naming': 'error',
    'grain/variable-naming': 'error',
    'grain/function-naming': 'error',
    'grain/boolean-naming': 'error',
    'grain/constant-naming': 'error',
    
    // ============================================
    // Complexity Rules - All error
    // ============================================
    'grain/max-function-lines': 'error',
    'grain/max-params': 'error',
    'grain/max-nesting': 'error',
    'grain/cyclomatic-complexity': 'error',
    'grain/max-file-lines': 'error',
    
    // ============================================
    // React Component Rules - All error
    // ============================================
    'grain/require-memo': 'error',
    'grain/no-inline-functions': 'error',
    'grain/require-callback': 'error',
    'grain/hooks-patterns': 'error',
    'grain/component-patterns': 'error',
    
    // ============================================
    // Import Organization Rules - All error
    // ============================================
    'grain/no-default-export': 'error',
    'grain/no-banned-imports': 'error',
    'grain/require-alias': 'error',
    'grain/import-grouping': 'error',
    'grain/no-deprecated-imports': 'error',
    
    // ============================================
    // Security Rules - All error
    // ============================================
    'grain/no-eval': 'error',
    'grain/no-innerhtml': 'error',
    'grain/no-sensitive-logging': 'error',
    
    // ============================================
    // Documentation Rules - All error
    // ============================================
    'grain/require-jsdoc': 'error',
    'grain/no-commented-code': 'error',
    'grain/chinese-comments': 'error',
    
    // ============================================
    // Magic Values Rules - All error
    // ============================================
    'grain/no-magic-numbers': 'error',
    'grain/no-hardcoded-values': 'error',
    
    // ============================================
    // Conditional Statement Rules - All error
    // ============================================
    'grain/no-nested-ternary': 'error',
    'grain/strict-equality': 'error',
    'grain/require-switch-default': 'error',
    
    // ============================================
    // Type Safety Rules - All error
    // ============================================
    'grain/no-any': 'error',
    'grain/no-non-null-assertion': 'error',
    'grain/require-return-type': 'error',
    
    // ============================================
    // Zustand State Management Rules - All error
    // ============================================
    'grain/zustand-patterns': 'error',
  },
} as const;
