/**
 * ESLint Rule: no-react-in-pure-layers
 * 禁止在纯函数层导入 React
 *
 * pipes/, utils/, io/, state/ 层必须保持纯净，不能包含任何 React 相关代码
 *
 * @requirements 3.10
 * @property Property 4: Side Effect Detection in Pure Layers
 */

import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  getArchitectureLayer,
  isTestFile,
} from '../../utils/architecture.js';
import { REACT_IMPORTS } from '../../types/config.types.js';
import type { ArchitectureLayer } from '../../types/rule.types.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://grain.dev/eslint-rules/${name}`
);

type MessageIds = 
  | 'noReactInPipes' 
  | 'noReactInUtils' 
  | 'noReactInIo' 
  | 'noReactInState'
  | 'noReactHooksInPure'
  | 'noReactTypesInPure';

/**
 * 纯函数层列表（不应包含 React）
 */
const PURE_LAYERS: ArchitectureLayer[] = ['pipes', 'utils', 'io', 'state'];

/**
 * 所有 React 相关的导入模式
 */
const REACT_IMPORT_PATTERNS = [
  // 核心 React 包
  /^react$/,
  /^react-dom(\/.*)?$/,
  /^react\/jsx-runtime$/,
  /^react\/jsx-dev-runtime$/,
  // React 类型
  /^@types\/react(\/.*)?$/,
  /^@types\/react-dom(\/.*)?$/,
  // React 生态系统
  /^react-router(\/.*)?$/,
  /^react-router-dom(\/.*)?$/,
  /^@tanstack\/react-query(\/.*)?$/,
  /^@tanstack\/react-router(\/.*)?$/,
  /^@tanstack\/react-table(\/.*)?$/,
  /^@tanstack\/react-form(\/.*)?$/,
  /^@radix-ui\/react-.*/,
  /^@headlessui\/react(\/.*)?$/,
  /^framer-motion(\/.*)?$/,
  /^react-spring(\/.*)?$/,
  /^react-hook-form(\/.*)?$/,
  /^formik(\/.*)?$/,
  /^swr(\/.*)?$/,
  // 注意：zustand, jotai, recoil 在 state/ 层是允许的
];

/**
 * 状态管理库（在 state/ 层允许）
 */
const STATE_MANAGEMENT_LIBS = [
  /^zustand(\/.*)?$/,
  /^jotai(\/.*)?$/,
  /^recoil(\/.*)?$/,
  /^@reduxjs\/toolkit(\/.*)?$/,
  /^redux(\/.*)?$/,
];

/**
 * 检查导入路径是否为 React 相关
 */
function isReactRelatedImport(importPath: string, currentLayer: ArchitectureLayer): boolean {
  // 检查核心 React 导入
  if (REACT_IMPORTS.some(pkg => importPath === pkg || importPath.startsWith(`${pkg}/`))) {
    return true;
  }
  
  // 检查 React 相关模式
  if (REACT_IMPORT_PATTERNS.some(pattern => pattern.test(importPath))) {
    return true;
  }
  
  // 状态管理库在 state/ 层是允许的
  if (currentLayer !== 'state' && STATE_MANAGEMENT_LIBS.some(pattern => pattern.test(importPath))) {
    return true;
  }
  
  return false;
}

/**
 * 检查是否为类型导入
 */
function isTypeOnlyImport(node: TSESTree.ImportDeclaration): boolean {
  if (node.importKind === 'type') {
    return true;
  }
  
  return node.specifiers.every(spec => 
    spec.type === 'ImportSpecifier' && spec.importKind === 'type'
  );
}

/**
 * 检查是否为 React hooks 导入（use 开头的命名导入）
 */
function hasReactHooksImport(specifiers: TSESTree.ImportClause[]): boolean {
  return specifiers.some(spec => {
    if (spec.type === 'ImportSpecifier') {
      const name = spec.imported.type === 'Identifier' 
        ? spec.imported.name 
        : spec.imported.value;
      return name.startsWith('use') && name.length > 3;
    }
    return false;
  });
}

/**
 * 获取层级对应的消息 ID
 */
function getMessageIdForLayer(layer: ArchitectureLayer, isTypeOnly: boolean): MessageIds {
  if (isTypeOnly) {
    return 'noReactTypesInPure';
  }
  
  switch (layer) {
    case 'pipes':
      return 'noReactInPipes';
    case 'utils':
      return 'noReactInUtils';
    case 'io':
      return 'noReactInIo';
    case 'state':
      return 'noReactInState';
    default:
      return 'noReactInPipes';
  }
}

export default createRule<[], MessageIds>({
  name: 'no-react-in-pure-layers',
  meta: {
    type: 'problem',
    docs: {
      description: '禁止在纯函数层（pipes/, utils/, io/, state/）导入 React 相关代码',
    },
    messages: {
      noReactInPipes: `❌ pipes/ 层禁止导入 React

🔍 原因：
  pipes/ 层必须是纯函数，不能包含任何 React 相关代码。
  React 组件和 hooks 会引入副作用和生命周期依赖。

🏗️ 架构原则：
  pipes/ 层只能包含纯数据转换函数：
  - 无副作用
  - 相同输入总是产生相同输出
  - 不依赖外部状态

✅ 修复方案：
  1. 如果需要 React 组件，移动到 views/ 层
  2. 如果需要 hooks，移动到 hooks/ 层
  3. 如果是数据转换逻辑，保持纯函数形式

📚 参考文档：#architecture - 纯函数层
📋 Steering 文件：#fp-patterns - 纯函数`,

      noReactInUtils: `❌ utils/ 层禁止导入 React

🔍 原因：
  utils/ 层只能包含通用工具函数，不能依赖 React。
  工具函数应该是框架无关的纯函数。

🏗️ 架构原则：
  utils/ 层的职责：
  - 通用工具函数（日期、字符串、数组处理等）
  - 只能依赖 types/
  - 不能依赖任何框架

✅ 修复方案：
  1. 如果需要 React 相关工具，移动到 hooks/ 层
  2. 如果是 UI 工具，移动到 views/ui/ 层
  3. 保持工具函数的框架无关性

📚 参考文档：#architecture - 工具层
📋 Steering 文件：#structure - 目录结构`,

      noReactInIo: `❌ io/ 层禁止导入 React

🔍 原因：
  io/ 层负责外部交互（API、存储、文件），不应依赖 UI 框架。
  React 相关代码会破坏 IO 层的独立性。

🏗️ 架构原则：
  io/ 层的职责：
  - API 调用
  - 存储操作
  - 文件系统交互
  - 只能依赖 types/

✅ 修复方案：
  1. 将 React 相关逻辑移动到 hooks/ 或 views/ 层
  2. 保持 IO 层的框架无关性

📚 参考文档：#architecture - IO 层`,

      noReactInState: `❌ state/ 层禁止导入 React（状态管理库除外）

🔍 原因：
  state/ 层负责状态管理，不应直接依赖 React 组件或 hooks。
  状态管理应该是框架无关的。

🏗️ 架构原则：
  state/ 层的职责：
  - Zustand store 定义
  - 状态逻辑
  - 只能依赖 types/

✅ 修复方案：
  1. 将 React 相关逻辑移动到 hooks/ 层
  2. 状态管理库（zustand, jotai）是允许的

📚 参考文档：#architecture - 状态层`,

      noReactHooksInPure: `❌ 纯函数层禁止使用 React Hooks

🔍 原因：
  检测到导入了 React Hooks（use* 函数）。
  Hooks 依赖 React 运行时，不能在纯函数层使用。

✅ 修复方案：
  将使用 hooks 的代码移动到 hooks/ 层

📚 参考文档：#architecture - 绑定层`,

      noReactTypesInPure: `❌ 纯函数层禁止导入 React 类型

🔍 原因：
  即使是类型导入，也表明代码与 React 耦合。
  纯函数层应该使用通用的 TypeScript 类型。

✅ 修复方案：
  1. 使用通用的 TypeScript 类型
  2. 将 React 特定的类型定义移动到 types/ 层
  3. 重新考虑架构设计

📚 参考文档：#architecture - 类型层`,
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename;

    // 如果没有文件名，跳过检查
    if (!filename) {
      return {};
    }

    // 跳过测试文件
    if (isTestFile(filename)) {
      return {};
    }

    // 获取当前文件的架构层级
    const currentLayer = getArchitectureLayer(filename);
    
    // 只检查纯函数层
    if (!currentLayer || !PURE_LAYERS.includes(currentLayer)) {
      return {};
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;

        // 检查是否为 React 相关导入
        if (isReactRelatedImport(importPath, currentLayer)) {
          const isTypeOnly = isTypeOnlyImport(node);
          const messageId = getMessageIdForLayer(currentLayer, isTypeOnly);

          context.report({
            node,
            messageId,
          });
          return;
        }

        // 检查是否导入了 hooks（即使从非 React 包）
        if (hasReactHooksImport(node.specifiers)) {
          context.report({
            node,
            messageId: 'noReactHooksInPure',
          });
        }
      },
      
      // 检查 require() 调用
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string'
        ) {
          const importPath = node.arguments[0].value;
          
          if (isReactRelatedImport(importPath, currentLayer)) {
            const messageId = getMessageIdForLayer(currentLayer, false);
            
            context.report({
              node,
              messageId,
            });
          }
        }
      },
    };
  },
});
