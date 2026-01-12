import { ESLintUtils } from '@typescript-eslint/utils';
import { buildComprehensiveErrorMessage } from '../../utils/message-builder';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

export default createRule({
  name: 'no-eval',
  meta: {
    type: 'problem',
    docs: {
      description: '❌ 禁止使用 eval() 和 Function 构造函数',
    },
    messages: {
      noEval: buildComprehensiveErrorMessage({
        title: '禁止使用 eval()',
        problemCode: `const result = eval('1 + 2');
const prop = eval('obj.' + key);`,
        reason: `eval() 会执行任意字符串代码，存在严重安全风险：
  - 代码注入攻击（XSS）
  - 无法进行静态分析和优化
  - 破坏作用域和类型安全
  - 性能极差`,
        architecturePrinciple: `Grain 项目的安全原则：
  - 永远不要执行动态代码
  - 所有代码必须是静态可分析的
  - 使用类型安全的替代方案`,
        steps: [
          '移除 eval() 调用',
          '使用 JSON.parse() 解析数据',
          '使用对象字面量或 Map 替代动态属性访问',
          '使用函数式编程模式替代动态代码生成',
        ],
        correctExample: `// ✅ 正确：使用 JSON.parse 解析数据
const data = JSON.parse('{"value": 123}');

// ✅ 正确：使用对象访问
const prop = obj[key];

// ✅ 正确：使用 Map 或对象字面量
const operations = {
  add: (a: number, b: number) => a + b,
  subtract: (a: number, b: number) => a - b,
};
const result = operations[operation](x, y);`,
        warnings: [
          '如果需要解析 JSON，使用 JSON.parse()',
          '如果需要动态属性访问，使用方括号语法 obj[key]',
          '如果需要动态行为，使用策略模式或查找表',
        ],
        docRef: '#security - 禁止动态代码执行',
        steeringFile: '#code-standards - 安全规范',
        relatedRules: ['no-function-constructor', 'no-implied-eval'],
      }),
      noFunctionConstructor: buildComprehensiveErrorMessage({
        title: '禁止使用 Function 构造函数',
        problemCode: `const fn = new Function('a', 'b', 'return a + b');`,
        reason: `Function 构造函数与 eval() 类似，会执行字符串代码：
  - 存在代码注入风险
  - 无法进行静态分析
  - 破坏类型安全
  - 性能差`,
        architecturePrinciple: `Grain 项目的安全原则：
  - 所有函数必须是静态定义的
  - 使用普通函数声明或箭头函数
  - 避免任何形式的动态代码生成`,
        steps: [
          '移除 Function 构造函数',
          '使用普通函数声明',
          '使用箭头函数',
          '使用高阶函数替代动态函数生成',
        ],
        correctExample: `// ✅ 正确：使用普通函数
function add(a: number, b: number): number {
  return a + b;
}

// ✅ 正确：使用箭头函数
const add = (a: number, b: number): number => a + b;

// ✅ 正确：使用高阶函数
const createOperation = (op: (a: number, b: number) => number) => op;
const add = createOperation((a, b) => a + b);`,
        warnings: [
          '永远不要从字符串创建函数',
          '使用类型安全的函数定义',
          '如果需要动态行为，使用策略模式',
        ],
        docRef: '#security - 禁止动态代码执行',
        steeringFile: '#code-standards - 安全规范',
        relatedRules: ['no-eval', 'no-implied-eval'],
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      // 检测 eval() 调用
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'eval') {
          context.report({
            node,
            messageId: 'noEval',
          });
        }
      },
      // 检测 Function 构造函数
      NewExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'Function') {
          context.report({
            node,
            messageId: 'noFunctionConstructor',
          });
        }
      },
    };
  },
});
