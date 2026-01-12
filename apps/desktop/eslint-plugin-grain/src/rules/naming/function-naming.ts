import { ESLintUtils } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { DEFAULT_NAMING_CONFIG } from '../../types/config.types';
import { buildErrorMessage, buildWarningMessage } from '../../utils/message-builder';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

export default createRule({
  name: 'function-naming',
  meta: {
    type: 'problem',
    docs: {
      description: '强制执行函数命名规范（动词开头、事件处理器命名）',
      recommended: 'error',
    },
    messages: {
      noVerbPrefix: '函数名应以动词开头',
      invalidEventHandler: '事件处理器命名不符合规范',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const { verbPrefixes, eventHandlerPrefixes } = DEFAULT_NAMING_CONFIG;

    function startsWithVerb(name: string): boolean {
      return verbPrefixes.some(verb => 
        name.toLowerCase().startsWith(verb.toLowerCase())
      );
    }

    function isEventHandler(name: string): boolean {
      return eventHandlerPrefixes.some(prefix =>
        name.toLowerCase().startsWith(prefix.toLowerCase())
      );
    }

    function checkFunctionName(name: string, node: any) {
      // 跳过 React 组件（首字母大写）
      if (/^[A-Z]/.test(name)) {
        return;
      }

      // 跳过私有函数（以 _ 开头）
      if (name.startsWith('_')) {
        return;
      }

      // 检查事件处理器命名
      if (name.includes('handler') || name.includes('Handler')) {
        if (!isEventHandler(name)) {
          context.report({
            node,
            messageId: 'invalidEventHandler',
            message: buildErrorMessage({
              title: `事件处理器 "${name}" 命名不符合规范`,
              reason: `事件处理器必须以 ${eventHandlerPrefixes.join(' 或 ')} 开头。
当前函数名：${name}`,
              correctExample: `// ✅ 正确的事件处理器命名
const handleClick = () => { /* ... */ };
const handleSubmit = () => { /* ... */ };
const onMount = () => { /* ... */ };
const onChange = (value: string) => { /* ... */ };`,
              incorrectExample: `// ❌ 错误的事件处理器命名
const ${name} = () => { /* ... */ };
const clickHandler = () => { /* ... */ };  // 应该是 handleClick`,
              docRef: '#code-standards - 事件处理器命名',
            }),
          });
          return;
        }
      }

      // 检查是否以动词开头
      if (!startsWithVerb(name) && !isEventHandler(name)) {
        context.report({
          node,
          messageId: 'noVerbPrefix',
          message: buildWarningMessage({
            title: `函数名 "${name}" 应以动词开头`,
            suggestion: `函数名应该描述函数的动作，使用动词开头可以提高代码可读性。

建议的动词前缀：
${verbPrefixes.slice(0, 20).join(', ')}...

当前函数名：${name}
建议改为：${getSuggestion(name)}`,
            example: `// ✅ 正确的函数命名
const getUserById = (id: string) => { /* ... */ };
const createWorkspace = (name: string) => { /* ... */ };
const validateInput = (input: string) => { /* ... */ };
const transformData = (data: Data) => { /* ... */ };`,
          }),
        });
      }
    }

    function getSuggestion(name: string): string {
      // 尝试提供智能建议
      if (name.includes('user')) return `getUser, createUser, updateUser, deleteUser`;
      if (name.includes('data')) return `getData, transformData, validateData`;
      if (name.includes('node')) return `getNode, createNode, updateNode`;
      return `get${capitalize(name)}, create${capitalize(name)}, update${capitalize(name)}`;
    }

    function capitalize(str: string): string {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    return {
      FunctionDeclaration(node) {
        if (node.id && node.id.type === AST_NODE_TYPES.Identifier) {
          checkFunctionName(node.id.name, node.id);
        }
      },
      VariableDeclarator(node) {
        // 检查函数表达式和箭头函数
        if (
          node.id.type === AST_NODE_TYPES.Identifier &&
          (node.init?.type === AST_NODE_TYPES.FunctionExpression ||
           node.init?.type === AST_NODE_TYPES.ArrowFunctionExpression)
        ) {
          checkFunctionName(node.id.name, node.id);
        }
      },
    };
  },
});
