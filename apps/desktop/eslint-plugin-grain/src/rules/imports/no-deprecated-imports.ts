/**
 * @fileoverview Rule to detect deprecated internal directory imports
 * @author Grain Team
 */

import { ESLintUtils } from '@typescript-eslint/utils';
import { TSESTree } from '@typescript-eslint/utils';
import { buildErrorMessage } from '../../utils/message-builder.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`
);

// Deprecated directories and their replacements
const DEPRECATED_PATHS: Record<string, string> = {
  '@/fn/': '@/pipes/, @/utils/, @/flows/',
  '@/components/': '@/views/',
  '@/actions/': '@/flows/',
  '@/stores/': '@/state/',
  '@/lib/': '@/utils/',
};

function getDeprecatedPath(source: string): string | null {
  for (const deprecated of Object.keys(DEPRECATED_PATHS)) {
    if (source.startsWith(deprecated)) {
      return deprecated;
    }
  }
  return null;
}

export default createRule({
  name: 'no-deprecated-imports',
  meta: {
    type: 'problem',
    docs: {
      description: '检测废弃目录导入，强制使用新的架构层级',
    },
    fixable: undefined,
    schema: [],
    messages: {
      deprecatedImport: `❌ 禁止从废弃目录 "{{deprecatedPath}}" 导入

🔍 原因：
  该目录已被废弃，不符合新的架构层级规范

✅ 迁移指南：
  {{deprecatedPath}} → {{replacement}}

📋 迁移步骤：
  1. 找到对应的新目录位置
  2. 更新导入路径
  3. 确保功能正常

🏗️ 架构层级：
  views/   - UI 组件
  hooks/   - React 绑定
  flows/   - 业务流程
  pipes/   - 纯数据转换
  io/      - 外部交互
  state/   - 状态管理
  utils/   - 工具函数
  types/   - 类型定义

📚 参考文档：#structure - 目录结构`,
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const source = node.source.value;
        
        if (typeof source !== 'string') return;
        
        const deprecatedPath = getDeprecatedPath(source);
        
        if (deprecatedPath) {
          context.report({
            node: node.source,
            messageId: 'deprecatedImport',
            data: {
              deprecatedPath,
              replacement: DEPRECATED_PATHS[deprecatedPath],
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
          const deprecatedPath = getDeprecatedPath(source);
          
          if (deprecatedPath) {
            context.report({
              node: node.arguments[0],
              messageId: 'deprecatedImport',
              data: {
                deprecatedPath,
                replacement: DEPRECATED_PATHS[deprecatedPath],
              },
            });
          }
        }
      },
    };
  },
});
