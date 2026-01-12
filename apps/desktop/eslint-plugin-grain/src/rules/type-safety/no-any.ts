import { ESLintUtils } from '@typescript-eslint/utils';
import { buildErrorMessage } from '../../utils/message-builder';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

/**
 * 规则：禁止使用 any 类型
 * 要求：Requirements 12.1
 */
export default createRule({
  name: 'no-any',
  meta: {
    type: 'problem',
    docs: {
      description: '禁止使用 any 类型，必须使用明确的类型定义',
    },
    messages: {
      noAnyType: buildErrorMessage({
        title: '禁止使用 any 类型',
        reason: `
  any 类型完全放弃了 TypeScript 的类型检查：
  - 失去编译时类型安全保障
  - 无法获得 IDE 智能提示
  - 容易引入运行时错误
  - 破坏类型系统的完整性`,
        correctExample: `// ✅ 使用明确的类型
function processData(data: UserData): Result {
  return transform(data);
}

// ✅ 使用泛型
function identity<T>(value: T): T {
  return value;
}

// ✅ 使用 unknown 并进行类型收窄
function parseJson(json: string): unknown {
  return JSON.parse(json);
}

function processUnknown(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }
  if (typeof data === 'object' && data !== null) {
    return JSON.stringify(data);
  }
  return String(data);
}`,
        incorrectExample: `// ❌ 使用 any
function processData(data: any): any {
  return data.something;
}

// ❌ any 数组
const items: any[] = [];

// ❌ any 参数
function handle(event: any) {
  console.log(event);
}`,
        docRef: '#code-standards - 类型安全',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      TSAnyKeyword(node) {
        context.report({
          node,
          messageId: 'noAnyType',
        });
      },
    };
  },
});
