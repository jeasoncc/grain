import { ESLintUtils } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { DEFAULT_NAMING_CONFIG } from '../../types/config.types';
import { buildErrorMessage } from '../../utils/message-builder';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

export default createRule({
  name: 'variable-naming',
  meta: {
    type: 'problem',
    docs: {
      description: '强制执行变量命名规范（最小长度和允许的短变量名）',
      recommended: 'error',
    },
    messages: {
      variableTooShort: '变量名过短',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const { minVariableLength, allowedShortNames } = DEFAULT_NAMING_CONFIG;

    function checkVariableName(name: string, node: any) {
      // 跳过允许的短变量名
      if (allowedShortNames.includes(name)) {
        return;
      }

      // 跳过私有变量（以 _ 开头）
      if (name.startsWith('_')) {
        return;
      }

      // 检查最小长度
      if (name.length < minVariableLength) {
        context.report({
          node,
          messageId: 'variableTooShort',
          message: buildErrorMessage({
            title: `变量名 "${name}" 过短（最少 ${minVariableLength} 个字符）`,
            reason: `过短的变量名降低代码可读性，难以理解变量的用途。
当前变量名：${name}（${name.length} 个字符）
最小要求：${minVariableLength} 个字符`,
            correctExample: `// ✅ 正确的变量名（描述性强）
const userId = 123;
const userName = 'John';
const isActive = true;
const count = 0;

// 允许的短变量名（特殊情况）
${allowedShortNames.map(n => `const ${n} = ...;  // ${n} 是允许的`).join('\n')}`,
            incorrectExample: `// ❌ 错误的变量名（过短）
const ${name} = ...;`,
            docRef: '#code-standards - 命名规范',
          }),
        });
      }
    }

    return {
      VariableDeclarator(node) {
        if (node.id.type === AST_NODE_TYPES.Identifier) {
          checkVariableName(node.id.name, node.id);
        }
      },
      FunctionDeclaration(node) {
        // 检查函数参数
        node.params.forEach(param => {
          if (param.type === AST_NODE_TYPES.Identifier) {
            checkVariableName(param.name, param);
          }
        });
      },
      ArrowFunctionExpression(node) {
        // 检查箭头函数参数
        node.params.forEach(param => {
          if (param.type === AST_NODE_TYPES.Identifier) {
            checkVariableName(param.name, param);
          }
        });
      },
    };
  },
});
