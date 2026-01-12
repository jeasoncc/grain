import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import { buildErrorMessage } from '../../utils/message-builder';
import { DEFAULT_COMPLEXITY_CONFIG } from '../../types/config.types';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

type MessageIds = 'maxParams';
type Options = [{ max?: number }];

export default createRule<Options, MessageIds>({
  name: 'max-params',
  meta: {
    type: 'problem',
    docs: {
      description: '限制函数参数最大数量',
      recommended: 'error',
    },
    messages: {
      maxParams: buildErrorMessage({
        title: '函数 {{functionName}} 参数超过 {{max}} 个（当前 {{actual}} 个）',
        reason: `过多的参数表明函数职责不清晰：
  - 函数做了太多事情
  - 参数顺序难以记忆
  - 调用时容易出错
  - 难以扩展和维护`,
        correctExample: `// ✅ 使用对象参数
interface CreateUserParams {
  name: string;
  email: string;
  age: number;
  role: string;
  department: string;
}

function createUser(params: CreateUserParams) {
  const { name, email, age, role, department } = params;
  // 实现逻辑
}

// 调用时更清晰
createUser({
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
  role: 'developer',
  department: 'engineering',
});`,
        incorrectExample: `// ❌ 参数过多
function createUser(
  name: string,
  email: string,
  age: number,
  role: string,
  department: string
) {
  // 实现逻辑
}

// 调用时容易出错
createUser('Alice', 'alice@example.com', 30, 'developer', 'engineering');`,
        docRef: '#code-standards - 复杂度限制',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: {
            type: 'number',
            minimum: 0,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ max: DEFAULT_COMPLEXITY_CONFIG.maxParams }],
  create(context, [options]) {
    const maxParams = options.max ?? DEFAULT_COMPLEXITY_CONFIG.maxParams;

    function checkParams(
      node:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression
    ) {
      const actualParams = node.params.length;

      if (actualParams > maxParams) {
        const functionName = getFunctionName(node);
        context.report({
          node,
          messageId: 'maxParams',
          data: {
            functionName,
            max: String(maxParams),
            actual: String(actualParams),
          },
        });
      }
    }

    return {
      FunctionDeclaration: checkParams,
      FunctionExpression: checkParams,
      ArrowFunctionExpression: checkParams,
    };
  },
});

function getFunctionName(
  node:
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression
    | TSESTree.ArrowFunctionExpression
): string {
  if (node.type === 'FunctionDeclaration' && node.id) {
    return node.id.name;
  }

  if (node.parent) {
    if (node.parent.type === 'VariableDeclarator' && node.parent.id.type === 'Identifier') {
      return node.parent.id.name;
    }
    if (node.parent.type === 'Property' && node.parent.key.type === 'Identifier') {
      return node.parent.key.name;
    }
    if (node.parent.type === 'MethodDefinition' && node.parent.key.type === 'Identifier') {
      return node.parent.key.name;
    }
  }

  return '(匿名函数)';
}
