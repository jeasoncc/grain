import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import { buildErrorMessage } from '../../utils/message-builder';
import { DEFAULT_COMPLEXITY_CONFIG } from '../../types/config.types';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

type MessageIds = 'cyclomaticComplexity';
type Options = [{ max?: number }];

export default createRule<Options, MessageIds>({
  name: 'cyclomatic-complexity',
  meta: {
    type: 'problem',
    docs: {
      description: '限制函数圈复杂度',
    },
    messages: {
      cyclomaticComplexity: buildErrorMessage({
        title: '函数 {{functionName}} 圈复杂度超过 {{max}}（当前 {{actual}}）',
        reason: `高圈复杂度意味着过多的分支路径：
  - 难以测试所有路径
  - 容易出现逻辑错误
  - 难以理解和维护
  - 违反单一职责原则`,
        correctExample: `// ✅ 使用策略模式
const handlers: Record<string, (data: Data) => Result> = {
  create: createHandler,
  update: updateHandler,
  delete: deleteHandler,
};

function process(action: string, data: Data) {
  const handler = handlers[action];
  if (!handler) {
    return E.left(new Error('Unknown action'));
  }
  return handler(data);
}

// ✅ 使用查找表
const STATUS_MESSAGES = {
  pending: '处理中',
  success: '成功',
  error: '失败',
} as const;

function getStatusMessage(status: keyof typeof STATUS_MESSAGES) {
  return STATUS_MESSAGES[status] ?? '未知状态';
}`,
        incorrectExample: `// ❌ 圈复杂度过高
function process(action: string, data: Data) {
  if (action === 'create') {
    if (data.type === 'A') {
      if (data.valid) {
        // 处理 A
      } else {
        // 错误处理
      }
    } else if (data.type === 'B') {
      // 处理 B
    }
  } else if (action === 'update') {
    // 更新逻辑
  } else if (action === 'delete') {
    // 删除逻辑
  }
  // 圈复杂度 > 5
}`,
        docRef: '#code-standards - 复杂度限制',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: {
            type: 'number',
            minimum: 1,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ max: DEFAULT_COMPLEXITY_CONFIG.maxCyclomaticComplexity }],
  create(context, [options]) {
    const maxComplexity = options.max ?? DEFAULT_COMPLEXITY_CONFIG.maxCyclomaticComplexity;
    const complexityStack: number[] = [];

    function startFunction() {
      complexityStack.push(1); // 基础复杂度为 1
    }

    function endFunction(
      node:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression
    ) {
      const complexity = complexityStack.pop() ?? 1;
      if (complexity > maxComplexity) {
        const functionName = getFunctionName(node);
        context.report({
          node,
          messageId: 'cyclomaticComplexity',
          data: {
            functionName,
            max: String(maxComplexity),
            actual: String(complexity),
          },
        });
      }
    }

    function increaseComplexity() {
      if (complexityStack.length > 0) {
        complexityStack[complexityStack.length - 1]++;
      }
    }

    return {
      // 函数开始
      FunctionDeclaration: startFunction,
      FunctionExpression: startFunction,
      ArrowFunctionExpression: startFunction,

      // 函数结束
      'FunctionDeclaration:exit': endFunction,
      'FunctionExpression:exit': endFunction,
      'ArrowFunctionExpression:exit': endFunction,

      // 增加复杂度的节点
      IfStatement: increaseComplexity,
      ConditionalExpression: increaseComplexity, // 三元表达式
      ForStatement: increaseComplexity,
      ForInStatement: increaseComplexity,
      ForOfStatement: increaseComplexity,
      WhileStatement: increaseComplexity,
      DoWhileStatement: increaseComplexity,
      SwitchCase(node: TSESTree.SwitchCase) {
        // 每个 case 增加复杂度（除了 default）
        if (node.test !== null) {
          increaseComplexity();
        }
      },
      LogicalExpression(node: TSESTree.LogicalExpression) {
        // && 和 || 增加复杂度
        if (node.operator === '&&' || node.operator === '||') {
          increaseComplexity();
        }
      },
      CatchClause: increaseComplexity,
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
