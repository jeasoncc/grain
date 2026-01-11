/**
 * ESLint Plugin for Grain Functional Programming Architecture
 * 
 * This plugin enforces functional programming patterns and architectural
 * layer separation as defined in the Grain project's steering files.
 */

import { ESLintUtils } from '@typescript-eslint/utils';

// Import all rule modules
import noTryCatch from './rules/no-try-catch.js';
import noConsoleLog from './rules/no-console-log.js';
import noDateConstructor from './rules/no-date-constructor.js';
import noLodash from './rules/no-lodash.js';
// import noMutation from './rules/no-mutation.js';
import layerDependencies from './rules/layer-dependencies.js';
import noReactInPureLayers from './rules/no-react-in-pure-layers.js';
import noSideEffectsInPipes from './rules/no-side-effects-in-pipes.js';
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
    // Functional Programming Rules
    'no-try-catch': noTryCatch,
    'no-console-log': noConsoleLog,
    'no-date-constructor': noDateConstructor,
    'no-lodash': noLodash,
    // 'no-mutation': noMutation,
    
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
        'grain/no-try-catch': 'error',
        'grain/no-console-log': 'error',
        'grain/no-date-constructor': 'error',
        'grain/no-lodash': 'error',
        // 'grain/no-mutation': 'error',
        'grain/layer-dependencies': 'error',
        'grain/no-react-in-pure-layers': 'error',
        'grain/no-side-effects-in-pipes': 'error',
      },
    },
    
    strict: {
      plugins: ['grain'],
      rules: {
        'grain/no-try-catch': 'error',
        'grain/no-console-log': 'error',
        'grain/no-date-constructor': 'error',
        'grain/no-lodash': 'error',
        // 'grain/no-mutation': 'error',
        'grain/layer-dependencies': 'error',
        'grain/no-react-in-pure-layers': 'error',
        'grain/no-side-effects-in-pipes': 'error',
      },
    },
  },
};

export default plugin;

// Export utilities for rule development
export { createRule };
export type { ESLintUtils };