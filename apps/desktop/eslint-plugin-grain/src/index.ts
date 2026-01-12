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
import layerDependencies from './rules/layer-dependencies.js';
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
// import layerDependencies from './rules/layer-dependencies';
// import noReactInPureLayers from './rules/no-react-in-pure-layers';
// import noSideEffectsInPipes from './rules/no-side-effects-in-pipes';
// import preferPipe from './rules/prefer-pipe';
// import noPromiseCatch from './rules/no-promise-catch';
// import noThrow from './rules/no-throw';
// import noAsyncTryCatch from './rules/no-async-try-catch';
// import noStoreInViews from './rules/no-store-in-views';
// import requireMemo from './rules/require-memo';
// import requireFnTests from './rules/require-fn-tests';
// import requireFlowTests from './rules/require-flow-tests';
// import requirePipeTests from './rules/require-pipe-tests';
// import suggestComponentTests from './rules/suggest-component-tests';
// import importGrouping from './rules/import-grouping';
// import internalImportAlias from './rules/internal-import-alias';
// import noDeprecatedImports from './rules/no-deprecated-imports';

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
    
    // Architecture Layer Rules
    'layer-dependencies': layerDependencies,
    'no-react-in-pure-layers': noReactInPureLayers,
    'no-side-effects-in-pipes': noSideEffectsInPipes,
    
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
      },
    },
  },
};

export default plugin;

// Export utilities for rule development
export { createRule };
export type { ESLintUtils };