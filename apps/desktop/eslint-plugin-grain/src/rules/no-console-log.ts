/**
 * @fileoverview Rule to prohibit console usage and suggest logger usage
 * @author Grain Team
 */

import { ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`
);
import { TSESTree } from '@typescript-eslint/utils';
import { isMethodCall } from '../utils/index.js';

export default createRule({
  name: 'no-console-log',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prohibit console usage and suggest logger usage with proper format',
    },
    fixable: undefined,
    schema: [],
    messages: {
      noConsole: [
        '❌ 禁止使用 console.{{method}}！请使用 logger 进行日志记录。',
        '',
        '✅ 正确做法：',
        '  import logger from "@/io/log/logger";',
        '  logger.{{logLevel}}("[ModuleName] 操作描述", data);',
        '',
        '📋 日志格式规范：',
        '  - info: 一般信息记录',
        '  - warn: 警告信息',
        '  - error: 错误信息',
        '  - debug: 调试信息',
        '',
        '🔗 更多信息: 查看项目中的日志规范文档',
      ].join('\n'),
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check for console.* method calls
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'console' &&
          node.callee.property.type === 'Identifier'
        ) {
          const method = node.callee.property.name;
          
          // Map console methods to logger levels
          const logLevelMap: Record<string, string> = {
            log: 'info',
            info: 'info',
            warn: 'warn',
            error: 'error',
            debug: 'debug',
            trace: 'debug',
            dir: 'debug',
            table: 'debug',
            group: 'debug',
            groupCollapsed: 'debug',
            groupEnd: 'debug',
            time: 'debug',
            timeEnd: 'debug',
            count: 'debug',
            assert: 'error',
          };
          
          const logLevel = logLevelMap[method] || 'info';
          
          context.report({
            node,
            messageId: 'noConsole',
            data: {
              method,
              logLevel,
            },
          });
        }
      },
      
      // Also catch direct console identifier usage
      Identifier(node: TSESTree.Identifier) {
        if (
          node.name === 'console' &&
          node.parent?.type === 'MemberExpression' &&
          node.parent.object === node
        ) {
          // This will be caught by CallExpression above, so we don't need to report here
          return;
        }
        
        // Catch standalone console references
        if (
          node.name === 'console' &&
          node.parent?.type !== 'MemberExpression'
        ) {
          context.report({
            node,
            messageId: 'noConsole',
            data: {
              method: 'object',
              logLevel: 'info',
            },
          });
        }
      },
    };
  },
});