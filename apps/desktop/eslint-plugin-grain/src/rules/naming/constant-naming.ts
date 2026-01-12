import { ESLintUtils } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { buildErrorMessage } from '../../utils/message-builder';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

const SCREAMING_SNAKE_CASE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;

export default createRule({
  name: 'constant-naming',
  meta: {
    type: 'problem',
    docs: {
      description: '强制执行常量命名规范（SCREAMING_SNAKE_CASE）',
      recommended: 'error',
    },
    messages: {
      invalidConstantName: '常量命名不符合规范',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function isScreamingSnakeCase(name: string): boolean {
      return SCREAMING_SNAKE_CASE.test(name);
    }

    function isConstant(node: any): boolean {
      // 必须是 const 声明
      if (node.parent?.parent?.kind !== 'const') {
        return false;
      }

      // 必须在模块顶层或导出
      const parent = node.parent?.parent?.parent;
      if (parent?.type !== AST_NODE_TYPES.Program && 
          parent?.type !== AST_NODE_TYPES.ExportNamedDeclaration) {
        return false;
      }

      // 初始值必须是字面量、对象字面量或数组字面量
      if (node.init) {
        const initType = node.init.type;
        if (
          initType === AST_NODE_TYPES.Literal ||
          initType === AST_NODE_TYPES.ObjectExpression ||
          initType === AST_NODE_TYPES.ArrayExpression ||
          initType === AST_NODE_TYPES.TemplateLiteral
        ) {
          return true;
        }
      }

      return false;
    }

    function isPrimitiveConstant(node: any): boolean {
      if (!isConstant(node)) return false;

      // 只检查原始类型常量（字符串、数字、布尔）
      if (node.init?.type === AST_NODE_TYPES.Literal) {
        const value = node.init.value;
        return typeof value === 'string' || 
               typeof value === 'number' || 
               typeof value === 'boolean';
      }

      return false;
    }

    function checkConstantName(name: string, node: any, declarator: any) {
      // 跳过私有常量
      if (name.startsWith('_')) {
        return;
      }

      // 跳过类型常量（通常是 PascalCase）
      if (/^[A-Z][a-z]/.test(name)) {
        return;
      }

      // 跳过函数常量（通常是 camelCase）
      if (declarator.init?.type === AST_NODE_TYPES.FunctionExpression ||
          declarator.init?.type === AST_NODE_TYPES.ArrowFunctionExpression) {
        return;
      }

      // 跳过对象和数组常量（通常是 camelCase）
      if (declarator.init?.type === AST_NODE_TYPES.ObjectExpression ||
          declarator.init?.type === AST_NODE_TYPES.ArrayExpression) {
        return;
      }

      if (isPrimitiveConstant(declarator) && !isScreamingSnakeCase(name)) {
        const suggestion = name
          .replace(/([a-z])([A-Z])/g, '$1_$2')  // camelCase -> snake_case
          .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')  // PascalCase -> snake_case
          .toUpperCase();

        context.report({
          node,
          messageId: 'invalidConstantName',
          message: buildErrorMessage({
            title: `常量 "${name}" 命名不符合规范`,
            reason: `模块级别的原始类型常量必须使用 SCREAMING_SNAKE_CASE 命名。
当前常量名：${name}
建议改为：${suggestion}`,
            correctExample: `// ✅ 正确的常量命名
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_TIMEOUT = 5000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ERROR_MESSAGES = {
  NOT_FOUND: '未找到',
  UNAUTHORIZED: '未授权',
};

// 非常量（camelCase 正确）
const getUserById = (id: string) => { /* ... */ };
const defaultConfig = { timeout: 5000 };  // 对象不需要 SCREAMING_SNAKE_CASE`,
            incorrectExample: `// ❌ 错误的常量命名
const ${name} = ${declarator.init?.type === AST_NODE_TYPES.Literal ? JSON.stringify(declarator.init.value) : '...'};
const maxRetryCount = 3;
const apiBaseUrl = 'https://api.example.com';`,
            docRef: '#code-standards - 常量命名',
          }),
        });
      }
    }

    return {
      VariableDeclarator(node) {
        if (node.id.type === AST_NODE_TYPES.Identifier) {
          checkConstantName(node.id.name, node.id, node);
        }
      },
    };
  },
});
