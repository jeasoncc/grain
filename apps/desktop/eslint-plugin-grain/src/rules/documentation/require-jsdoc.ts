import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import { buildComprehensiveErrorMessage } from '../../utils/message-builder';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

/**
 * 检查 JSDoc 是否完整
 */
function hasCompleteJSDoc(node: TSESTree.Node): {
  hasJSDoc: boolean;
  hasDescription: boolean;
  hasParams: boolean;
  hasReturns: boolean;
  missingParams: string[];
} {
  const sourceCode = node.parent?.parent;
  if (!sourceCode) {
    return {
      hasJSDoc: false,
      hasDescription: false,
      hasParams: false,
      hasReturns: false,
      missingParams: [],
    };
  }

  // 获取注释
  const comments = (node as any).parent?.leadingComments || [];
  const jsdocComment = comments.find((c: any) => c.type === 'Block' && c.value.startsWith('*'));

  if (!jsdocComment) {
    return {
      hasJSDoc: false,
      hasDescription: false,
      hasParams: false,
      hasReturns: false,
      missingParams: [],
    };
  }

  const jsdocText = jsdocComment.value;

  // 检查是否有描述（非 @tag 的文本）
  const hasDescription = /^\s*\*\s*[^@\s]/.test(jsdocText);

  // 检查参数
  const paramTags = jsdocText.match(/@param\s+\{[^}]+\}\s+\w+/g) || [];
  const hasParams = paramTags.length > 0;

  // 获取函数参数
  let functionParams: string[] = [];
  if (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  ) {
    functionParams = node.params.map((param) => {
      if (param.type === 'Identifier') {
        return param.name;
      }
      return '';
    }).filter(Boolean);
  }

  // 检查缺失的参数文档
  const documentedParams = paramTags.map((tag: string) => {
    const match = tag.match(/@param\s+\{[^}]+\}\s+(\w+)/);
    return match ? match[1] : '';
  });
  const missingParams = functionParams.filter((p) => !documentedParams.includes(p));

  // 检查返回值
  const hasReturns = /@returns?\s+\{[^}]+\}/.test(jsdocText);

  return {
    hasJSDoc: true,
    hasDescription,
    hasParams: functionParams.length === 0 || missingParams.length === 0,
    hasReturns,
    missingParams,
  };
}

/**
 * 检查函数是否被导出
 */
function isExported(node: TSESTree.Node): boolean {
  let current = node.parent;
  while (current) {
    if (
      current.type === 'ExportNamedDeclaration' ||
      current.type === 'ExportDefaultDeclaration'
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

export default createRule({
  name: 'require-jsdoc',
  meta: {
    type: 'suggestion',
    docs: {
      description: '📖 要求导出函数必须有完整的 JSDoc 注释',
    },
    messages: {
      missingJSDoc: buildComprehensiveErrorMessage({
        title: '导出函数缺少 JSDoc 注释',
        problemCode: `export function createNode(name: string, type: NodeType): Node {
  return { name, type };
}`,
        reason: `导出函数是公共 API，必须有文档说明：
  - 帮助使用者理解函数用途
  - 说明参数含义和类型
  - 说明返回值
  - 提供使用示例`,
        architecturePrinciple: `Grain 项目的文档原则：
  - 所有导出函数必须有 JSDoc
  - JSDoc 必须包含描述、参数、返回值
  - 复杂函数应包含使用示例
  - 使用中文编写文档`,
        steps: [
          '在函数上方添加 JSDoc 注释',
          '添加函数描述',
          '为每个参数添加 @param 标签',
          '添加 @returns 标签说明返回值',
          '如果函数复杂，添加 @example 示例',
        ],
        correctExample: `/**
 * 创建新节点
 * 
 * @param {string} name - 节点名称
 * @param {NodeType} type - 节点类型
 * @returns {Node} 创建的节点对象
 * 
 * @example
 * const node = createNode('我的文档', NodeType.Document);
 */
export function createNode(name: string, type: NodeType): Node {
  return { name, type };
}`,
        warnings: [
          'JSDoc 必须使用中文编写（技术术语除外）',
          '描述应该清晰说明函数的作用',
          '参数说明应该解释参数的含义，而不仅仅是重复参数名',
        ],
        docRef: '#code-standards - 文档规范',
        steeringFile: '#code-standards - 注释规范',
        relatedRules: ['chinese-comments'],
      }),
      incompleteJSDoc: buildComprehensiveErrorMessage({
        title: 'JSDoc 注释不完整',
        problemCode: `/**
 * 创建节点
 */
export function createNode(name: string, type: NodeType): Node {
  return { name, type };
}`,
        reason: `JSDoc 注释缺少必要信息：
  - 缺少参数说明
  - 缺少返回值说明
  - 使用者无法了解如何使用函数`,
        architecturePrinciple: `Grain 项目的文档原则：
  - JSDoc 必须完整
  - 必须包含所有参数的 @param 标签
  - 必须包含 @returns 标签
  - 描述应该清晰明确`,
        steps: [
          '检查是否有函数描述',
          '为每个参数添加 @param 标签',
          '添加 @returns 标签',
          '确保所有标签都有类型和说明',
        ],
        correctExample: `/**
 * 创建新节点
 * 
 * @param {string} name - 节点名称
 * @param {NodeType} type - 节点类型（Document/Folder/Note）
 * @returns {Node} 创建的节点对象，包含 id、name、type 等属性
 */
export function createNode(name: string, type: NodeType): Node {
  return { name, type };
}`,
        warnings: [
          '每个参数都必须有 @param 标签',
          '返回值必须有 @returns 标签',
          '类型信息应该与 TypeScript 类型一致',
        ],
        docRef: '#code-standards - 文档规范',
        steeringFile: '#code-standards - 注释规范',
        relatedRules: ['chinese-comments'],
      }),
      missingDescription: buildComprehensiveErrorMessage({
        title: 'JSDoc 缺少函数描述',
        problemCode: `/**
 * @param {string} name
 * @returns {Node}
 */
export function createNode(name: string): Node {
  return { name };
}`,
        reason: `JSDoc 必须包含函数描述：
  - 说明函数的作用
  - 帮助使用者快速理解函数用途
  - 描述应该在所有 @tag 之前`,
        architecturePrinciple: `Grain 项目的文档原则：
  - 描述是 JSDoc 最重要的部分
  - 描述应该清晰、简洁
  - 使用中文编写`,
        steps: [
          '在 JSDoc 开头添加函数描述',
          '描述应该说明函数做什么',
          '描述和 @tag 之间空一行',
        ],
        correctExample: `/**
 * 创建新节点
 * 
 * @param {string} name - 节点名称
 * @returns {Node} 创建的节点对象
 */
export function createNode(name: string): Node {
  return { name };
}`,
        warnings: [
          '描述应该在第一行',
          '描述和 @tag 之间应该空一行',
          '描述应该使用中文',
        ],
        docRef: '#code-standards - 文档规范',
        steeringFile: '#code-standards - 注释规范',
        relatedRules: ['chinese-comments'],
      }),
      missingParams: buildComprehensiveErrorMessage({
        title: 'JSDoc 缺少参数说明',
        problemCode: `/**
 * 创建新节点
 * 
 * @returns {Node}
 */
export function createNode(name: string, type: NodeType): Node {
  return { name, type };
}`,
        reason: `JSDoc 必须为所有参数添加 @param 标签：
  - 说明参数的含义
  - 说明参数的类型
  - 帮助使用者正确传参`,
        architecturePrinciple: `Grain 项目的文档原则：
  - 每个参数都必须有文档
  - @param 标签必须包含类型和说明
  - 说明应该解释参数的含义`,
        steps: [
          '为每个参数添加 @param 标签',
          '格式：@param {Type} name - 说明',
          '说明应该清晰解释参数含义',
        ],
        correctExample: `/**
 * 创建新节点
 * 
 * @param {string} name - 节点名称
 * @param {NodeType} type - 节点类型（Document/Folder/Note）
 * @returns {Node} 创建的节点对象
 */
export function createNode(name: string, type: NodeType): Node {
  return { name, type };
}`,
        warnings: [
          '参数顺序应该与函数签名一致',
          '参数类型应该与 TypeScript 类型一致',
          '参数说明应该解释含义，不要只重复参数名',
        ],
        docRef: '#code-standards - 文档规范',
        steeringFile: '#code-standards - 注释规范',
        relatedRules: ['chinese-comments'],
      }),
      missingReturns: buildComprehensiveErrorMessage({
        title: 'JSDoc 缺少返回值说明',
        problemCode: `/**
 * 创建新节点
 * 
 * @param {string} name - 节点名称
 */
export function createNode(name: string): Node {
  return { name };
}`,
        reason: `JSDoc 必须说明返回值：
  - 说明返回值的类型
  - 说明返回值的含义
  - 帮助使用者理解函数输出`,
        architecturePrinciple: `Grain 项目的文档原则：
  - 所有有返回值的函数都必须有 @returns 标签
  - @returns 标签必须包含类型和说明
  - 说明应该解释返回值的含义`,
        steps: [
          '添加 @returns 标签',
          '格式：@returns {Type} 说明',
          '说明应该清晰解释返回值含义',
        ],
        correctExample: `/**
 * 创建新节点
 * 
 * @param {string} name - 节点名称
 * @returns {Node} 创建的节点对象，包含 id、name、type 等属性
 */
export function createNode(name: string): Node {
  return { name };
}`,
        warnings: [
          '返回值类型应该与 TypeScript 类型一致',
          '如果返回 void，可以省略 @returns',
          '返回值说明应该解释含义，不要只重复类型名',
        ],
        docRef: '#code-standards - 文档规范',
        steeringFile: '#code-standards - 注释规范',
        relatedRules: ['chinese-comments'],
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      // 检查函数声明
      FunctionDeclaration(node) {
        if (!isExported(node)) {
          return;
        }

        const jsdocInfo = hasCompleteJSDoc(node);

        if (!jsdocInfo.hasJSDoc) {
          context.report({
            node,
            messageId: 'missingJSDoc',
          });
          return;
        }

        if (!jsdocInfo.hasDescription) {
          context.report({
            node,
            messageId: 'missingDescription',
          });
        }

        if (!jsdocInfo.hasParams && node.params.length > 0) {
          context.report({
            node,
            messageId: 'missingParams',
          });
        }

        if (!jsdocInfo.hasReturns && node.returnType) {
          context.report({
            node,
            messageId: 'missingReturns',
          });
        }
      },

      // 检查变量声明中的函数表达式
      VariableDeclarator(node) {
        if (
          !node.init ||
          (node.init.type !== 'FunctionExpression' && node.init.type !== 'ArrowFunctionExpression')
        ) {
          return;
        }

        if (!isExported(node)) {
          return;
        }

        const jsdocInfo = hasCompleteJSDoc(node);

        if (!jsdocInfo.hasJSDoc) {
          context.report({
            node,
            messageId: 'missingJSDoc',
          });
          return;
        }

        if (!jsdocInfo.hasDescription) {
          context.report({
            node,
            messageId: 'missingDescription',
          });
        }

        if (!jsdocInfo.hasParams && node.init.params.length > 0) {
          context.report({
            node,
            messageId: 'missingParams',
          });
        }

        if (!jsdocInfo.hasReturns && node.init.returnType) {
          context.report({
            node,
            messageId: 'missingReturns',
          });
        }
      },
    };
  },
});
