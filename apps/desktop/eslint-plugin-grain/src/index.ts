/**
 * ESLint Plugin for Grain Functional Programming Architecture
 * 
 * This plugin enforces functional programming patterns and architectural
 * layer separation as defined in the Grain project's steering files.
 */

import { ESLintUtils } from '@typescript-eslint/utils';

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

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`
);

// Plugin configuration
const plugin = {
  meta: {
    name: 'eslint-plugin-grain',
    version: '1.0.0',
  },
  
  // Rules will be populated as they are implemented
  rules: {
    // Functional Programming Rules (Enhanced)
    'no-try-catch': noTryCatch,
    'no-throw': noThrow,
    'no-promise-methods': noPromiseMethods,
    'no-async-outside-io': noAsyncOutsideIo,
    'no-mutation': noMutation,
    'no-object-mutation': noObjectMutation,
    'fp-ts-patterns': fpTsPatterns,
    
    // Legacy rules (to be migrated or removed)
    'no-try-catch-legacy': noTryCatchLegacy,
    'no-mutation-legacy': noMutationLegacy,
    'no-console-log': noConsoleLog,
    'no-date-constructor': noDateConstructor,
    'no-lodash': noLodash,
    'layer-dependencies-legacy': layerDependenciesLegacy,
    
    // Architecture Layer Rules (Enhanced)
    'layer-dependencies': layerDependencies,
    'no-react-in-pure-layers': noReactInPureLayersNew,
    'no-side-effects-in-pipes': noSideEffectsInPipesNew,
    'no-store-in-views': noStoreInViews,
    'file-location': fileLocation,
    
    // Naming Rules
    'file-naming': fileNaming,
    'variable-naming': variableNaming,
    'function-naming': functionNaming,
    'boolean-naming': booleanNaming,
    'constant-naming': constantNaming,
    
    // Complexity Rules
    'max-function-lines': maxFunctionLines,
    'max-params': maxParams,
    'max-nesting': maxNesting,
    'cyclomatic-complexity': cyclomaticComplexity,
    'max-file-lines': maxFileLines,
    
    // React Rules
    'require-memo': reactRules['require-memo'],
    'no-inline-functions': reactRules['no-inline-functions'],
    'require-callback': reactRules['require-callback'],
    'hooks-patterns': reactRules['hooks-patterns'],
    'component-patterns': reactRules['component-patterns'],
    
    // Import Rules
    'no-default-export': importRules['no-default-export'],
    'no-banned-imports': importRules['no-banned-imports'],
    'require-alias': importRules['require-alias'],
    'import-grouping': importRules['import-grouping'],
    'no-deprecated-imports': importRules['no-deprecated-imports'],
    
    // Security Rules
    'no-eval': noEval,
    'no-innerhtml': noInnerhtml,
    'no-sensitive-logging': noSensitiveLogging,
    
    // Documentation Rules
    'require-jsdoc': requireJsdoc,
    'no-commented-code': noCommentedCode,
    'chinese-comments': chineseComments,
    
    // Magic Values Rules
    'no-magic-numbers': noMagicNumbers,
    'no-hardcoded-values': noHardcodedValues,
    
    // Architecture Layer Rules
    // 'layer-dependencies': layerDependencies,
    // 'no-react-in-pure-layers': noReactInPureLayers,
    // 'no-side-effects-in-pipes': noSideEffectsInPipes,
    
    // Advanced Functional Programming Rules
    // 'prefer-pipe': preferPipe,
    // 'no-promise-catch': noPromiseCatch,
    // 'no-throw': noThrow,
    // 'no-async-try-catch': noAsyncTryCatch,
    
    // Component Pattern Rules
    // 'no-store-in-views': noStoreInViews,
    // 'require-memo': requireMemo,
    
    // Testing Requirement Rules
    // 'require-fn-tests': requireFnTests,
    // 'require-flow-tests': requireFlowTests,
    // 'require-pipe-tests': requirePipeTests,
    // 'suggest-component-tests': suggestComponentTests,
    
    // Import Organization Rules
    // 'import-grouping': importGrouping,
    // 'internal-import-alias': internalImportAlias,
    // 'no-deprecated-imports': noDeprecatedImports,
  },
  
  // Predefined configurations
  configs: {
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
        'grain/no-console-log': 'error',
        'grain/no-date-constructor': 'error',
        'grain/no-lodash': 'error',
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
      },
    },
    
    strict: {
      plugins: ['grain'],
      rules: {
        // Functional Programming Rules - All error
        'grain/no-try-catch': 'error',
        'grain/no-throw': 'error',
        'grain/no-promise-methods': 'error',
        'grain/no-async-outside-io': 'error',
        'grain/no-mutation': 'error',
        'grain/no-object-mutation': 'error',
        'grain/fp-ts-patterns': 'error',
        'grain/no-console-log': 'error',
        'grain/no-date-constructor': 'error',
        'grain/no-lodash': 'error',
        // Architecture Rules - All error
        'grain/layer-dependencies': 'error',
        'grain/no-react-in-pure-layers': 'error',
        'grain/no-side-effects-in-pipes': 'error',
        'grain/no-store-in-views': 'error',
        'grain/file-location': 'error',
        // Naming Rules - All error
        'grain/file-naming': 'error',
        'grain/variable-naming': 'error',
        'grain/function-naming': 'error',
        'grain/boolean-naming': 'error',
        'grain/constant-naming': 'error',
        // Complexity Rules - All error
        'grain/max-function-lines': 'error',
        'grain/max-params': 'error',
        'grain/max-nesting': 'error',
        'grain/cyclomatic-complexity': 'error',
        'grain/max-file-lines': 'error',
        // React Rules - All error
        'grain/require-memo': 'error',
        'grain/no-inline-functions': 'error',
        'grain/require-callback': 'error',
        'grain/hooks-patterns': 'error',
        'grain/component-patterns': 'error',
        // Import Rules - All error
        'grain/no-default-export': 'error',
        'grain/no-banned-imports': 'error',
        'grain/require-alias': 'error',
        'grain/import-grouping': 'error',
        'grain/no-deprecated-imports': 'error',
        // Security Rules - All error
        'grain/no-eval': 'error',
        'grain/no-innerhtml': 'error',
        'grain/no-sensitive-logging': 'error',
        // Documentation Rules - All error
        'grain/require-jsdoc': 'error',
        'grain/no-commented-code': 'error',
        'grain/chinese-comments': 'error',
        // Magic Values Rules - All error
        'grain/no-magic-numbers': 'error',
        'grain/no-hardcoded-values': 'error',
      },
    },
    
    // Legacy config for migration
    legacy: {
      plugins: ['grain'],
      rules: {
        'grain/no-try-catch': 'warn',
        'grain/no-throw': 'warn',
        'grain/no-promise-methods': 'warn',
        'grain/no-async-outside-io': 'off',
        'grain/no-mutation': 'warn',
        'grain/no-object-mutation': 'warn',
        'grain/fp-ts-patterns': 'warn',
        'grain/no-console-log': 'warn',
        'grain/no-date-constructor': 'warn',
        'grain/no-lodash': 'error',
        'grain/layer-dependencies': 'warn',
        'grain/no-react-in-pure-layers': 'warn',
        'grain/no-side-effects-in-pipes': 'warn',
        'grain/no-store-in-views': 'warn',
        'grain/file-location': 'off',
      },
    },
  },
};

export default plugin;

// Export utilities for rule development
export { createRule };
export type { ESLintUtils };