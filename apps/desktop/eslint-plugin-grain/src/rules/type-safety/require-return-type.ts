import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import { buildWarningMessage } from '../../utils/message-builder';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

/**
 * 规则：要求函数显式声明返回类型
 * 要求：Requirements 12.6
 */
export default createRule({
  name: 'require-return-type',
  meta: {
    type: 'suggestion',
    docs: {
      description: '要求函数显式声明返回类型，提高代码可读性和类型安全性',
    },
    messages: {
      missingReturnType: buildWarningMessage({
        title: '函数缺少返回类型声明',
        suggestion: `
  显式声明返回类型可以：
  - 提高代码可读性，一眼看出函数的输出
  - 防止意外的类型推断错误
  - 使重构更安全
  - 提供更好的 IDE 智能提示`,
        example: `// ✅ 显式返回类型
function getUserName(user: User): string {
  return user.name;
}

// ✅ 箭头函数
const transform = (data: Data): Result => {
  return process(data);
};

// ✅ 异步函数
async function fetchData(): Promise<Data> {
  return await api.getData();
}

// ✅ TaskEither 返回类型
const saveNode = (node: Node): TE.TaskEither<AppError, void> => {
  return pipe(
    validateNode(node),
    TE.fromEither,
    TE.chain(nodeApi.save)
  );
};

// ✅ 高阶函数
function createHandler(config: Config): (event: Event) => void {
  return (event) => {
    handle(event, config);
  };
}`,
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    /**
     * 检查函数是否有返回类型注解
     */
    function checkFunction(
      node:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression
    ) {
      // 跳过类型声明文件
      const filename = context.getFilename();
      if (filename.endsWith('.d.ts')) {
        return;
      }

      // 跳过测试文件中的简单回调
      if (filename.includes('.test.') || filename.includes('.spec.')) {
        // 允许测试中的简单回调函数
        if (node.type === 'ArrowFunctionExpression' && node.parent?.type === 'CallExpression') {
          return;
        }
      }

      // 跳过立即执行的箭头函数（IIFE）
      if (
        node.type === 'ArrowFunctionExpression' &&
        node.parent?.type === 'CallExpression' &&
        node.parent.callee === node
      ) {
        return;
      }

      // 跳过作为参数传递的简单箭头函数（如 map, filter 等）
      if (
        node.type === 'ArrowFunctionExpression' &&
        node.parent?.type === 'CallExpression' &&
        node.body.type !== 'BlockStatement'
      ) {
        return;
      }

      // 检查是否有返回类型注解
      if (!node.returnType) {
        // 只对命名函数和导出的函数报告
        if (node.type === 'FunctionDeclaration' && node.id) {
          context.report({
            node,
            messageId: 'missingReturnType',
          });
        } else if (
          node.type === 'ArrowFunctionExpression' ||
          node.type === 'FunctionExpression'
        ) {
          // 检查是否是导出的变量声明
          const parent = node.parent;
          if (
            parent?.type === 'VariableDeclarator' &&
            parent.parent?.type === 'VariableDeclaration' &&
            parent.parent.parent?.type === 'ExportNamedDeclaration'
          ) {
            context.report({
              node,
              messageId: 'missingReturnType',
            });
          }
          // 检查是否是直接导出的箭头函数
          else if (parent?.type === 'ExportDefaultDeclaration') {
            context.report({
              node,
              messageId: 'missingReturnType',
            });
          }
          // 检查是否是对象方法
          else if (parent?.type === 'Property' && parent.parent?.type === 'ObjectExpression') {
            // 只对导出的对象方法报告
            const objectParent = parent.parent.parent;
            if (
              objectParent?.type === 'VariableDeclarator' &&
              objectParent.parent?.type === 'VariableDeclaration' &&
              objectParent.parent.parent?.type === 'ExportNamedDeclaration'
            ) {
              context.report({
                node,
                messageId: 'missingReturnType',
              });
            }
          }
        }
      }
    }

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    };
  },
});
