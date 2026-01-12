/**
 * @fileoverview Rule to prohibit lodash imports and suggest es-toolkit alternatives
 * @author Grain Team
 */

import { ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`
);
import { TSESTree } from '@typescript-eslint/utils';
import { BANNED_LIBRARIES } from '../types/config.types.js';

// Alias for backward compatibility
const DEPRECATED_MODULES = BANNED_LIBRARIES;

export default createRule({
  name: 'no-lodash',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prohibit lodash imports and suggest es-toolkit alternatives',
    },
    fixable: undefined,
    schema: [],
    messages: {
      noLodash: [
        '❌ 禁止使用 lodash！请使用 es-toolkit 替代。',
        '',
        '✅ 正确做法：',
        '  import { {{functionName}} } from "es-toolkit";',
        '',
        '🔄 常用函数对照：',
        '  lodash.debounce → es-toolkit/debounce',
        '  lodash.throttle → es-toolkit/throttle',
        '  lodash.cloneDeep → es-toolkit/cloneDeep',
        '  lodash.merge → es-toolkit/merge',
        '  lodash.pick → es-toolkit/pick',
        '  lodash.omit → es-toolkit/omit',
        '',
        '📚 es-toolkit 文档: https://es-toolkit.slash.page/',
      ].join('\n'),
      noDeprecatedModule: [
        '❌ 禁止使用已废弃的模块 "{{moduleName}}"！请使用 {{alternative}} 替代。',
        '',
        '✅ 推荐替代方案：{{alternative}}',
      ].join('\n'),
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const source = node.source.value;
        
        if (typeof source !== 'string') return;
        
        // Check for lodash imports
        if (source === 'lodash' || source.startsWith('lodash/')) {
          // Extract function name from import
          let functionName = 'function';
          
          if (node.specifiers.length > 0) {
            const specifier = node.specifiers[0];
            if (specifier.type === 'ImportDefaultSpecifier') {
              functionName = specifier.local.name;
            } else if (specifier.type === 'ImportSpecifier') {
              functionName = specifier.imported.type === 'Identifier' 
                ? specifier.imported.name 
                : specifier.imported.value;
            }
          }
          
          // For lodash/function imports, extract function name from path
          if (source.startsWith('lodash/')) {
            functionName = source.replace('lodash/', '');
          }
          
          context.report({
            node,
            messageId: 'noLodash',
            data: {
              functionName,
            },
          });
          return;
        }
        
        // Check for other deprecated modules
        if (source in DEPRECATED_MODULES) {
          context.report({
            node,
            messageId: 'noDeprecatedModule',
            data: {
              moduleName: source,
              alternative: DEPRECATED_MODULES[source],
            },
          });
        }
      },
      
      // Also check for require() calls
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string'
        ) {
          const source = node.arguments[0].value;
          
          // Check for lodash requires
          if (source === 'lodash' || source.startsWith('lodash/')) {
            let functionName = 'function';
            
            if (source.startsWith('lodash/')) {
              functionName = source.replace('lodash/', '');
            }
            
            context.report({
              node,
              messageId: 'noLodash',
              data: {
                functionName,
              },
            });
            return;
          }
          
          // Check for other deprecated modules
          if (source in DEPRECATED_MODULES) {
            context.report({
              node,
              messageId: 'noDeprecatedModule',
              data: {
                moduleName: source,
                alternative: DEPRECATED_MODULES[source],
              },
            });
          }
        }
      },
    };
  },
});