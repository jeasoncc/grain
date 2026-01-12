import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import { buildErrorMessage } from '../../utils/message-builder';
import { DEFAULT_COMPLEXITY_CONFIG } from '../../types/config.types';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

type MessageIds = 'maxFunctionLines';
type Options = [{ max?: number }];

export default createRule<Options, MessageIds>({
  name: 'max-function-lines',
  meta: {
    type: 'problem',
    docs: {
      description: '限制函数最大行数',
      recommended: 'error',
    },
    messages: {
      maxFunctionLines: buildErrorMessage({
        title: '函数 {{functionName}} 超过 {{max}} 行（当前 {{actual}} 行）',
        reason: `过长的函数难以理解、测试和维护。
  - 函数职责不清晰
  - 难以进行单元测试
  - 增加认知负担
  - 违反单一职责原则`,
        correctExample: `// ✅ 拆分为多个小函数
const validateInput = (input: Input): E.Either<Error, ValidInput> => {
  // 验证逻辑（5-10 行）
};

const transformData = (data: ValidInput): TransformedData => {
  // 转换逻辑（5-10 行）
};

const saveToDatabase = (data: TransformedData): TE.TaskEither<Error, Result> => {
  // 保存逻辑（5-10 行）
};

// 组合函数
const processInput = (input: Input) =>
  pipe(
    validateInput(input),
    E.map(transformData),
    TE.fromEither,
    TE.chain(saveToDatabase)
  );`,
        incorrectExample: `// ❌ 函数过长
function processInput(input: Input) {
  // 30+ 行的逻辑
  // 包含验证、转换、保存等多个职责
  // ...
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
  defaultOptions: [{ max: DEFAULT_COMPLEXITY_CONFIG.maxFunctionLines }],
  create(context, [options]) {
    const maxLines = options.max ?? DEFAULT_COMPLEXITY_CONFIG.maxFunctionLines;

    function checkFunctionLines(
      node:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression
    ) {
      if (!node.body) return;

      const startLine = node.loc.start.line;
      const endLine = node.loc.end.line;
      const actualLines = endLine - startLine + 1;

      if (actualLines > maxLines) {
        const functionName = getFunctionName(node);
        context.report({
          node,
          messageId: 'maxFunctionLines',
          data: {
            functionName,
            max: String(maxLines),
            actual: String(actualLines),
          },
        });
      }
    }

    return {
      FunctionDeclaration: checkFunctionLines,
      FunctionExpression: checkFunctionLines,
      ArrowFunctionExpression: checkFunctionLines,
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
