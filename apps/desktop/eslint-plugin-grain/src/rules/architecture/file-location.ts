/**
 * ESLint Rule: file-location
 * 检测文件是否在正确的目录，以及 index.ts 是否只包含重导出
 *
 * @requirements 28.1-28.5
 * @property Property 3: Architecture Layer Dependency Validation
 */

import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import path from 'path';
import {
  getArchitectureLayer,
  isTestFile,
  isIndexFilePattern,
  getRelativeImportDepth,
} from '../../utils/architecture.js';
import { FILE_NAMING_PATTERNS } from '../../types/config.types.js';
import type { ArchitectureLayer } from '../../types/rule.types.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://grain.dev/eslint-rules/${name}`
);

type MessageIds =
  | 'indexFileLogic'
  | 'multipleExports'
  | 'typesInWrongFile'
  | 'deepRelativeImport'
  | 'wrongFileLocation';

/**
 * 检查文件是否只包含重导出
 */
function hasOnlyReExports(body: TSESTree.Statement[]): boolean {
  for (const statement of body) {
    // 允许的语句类型
    if (
      statement.type === 'ExportAllDeclaration' ||  // export * from './module'
      statement.type === 'ExportNamedDeclaration'
    ) {
      const exportDecl = statement as TSESTree.ExportNamedDeclaration;
      
      // export { a, b } from './module' - 重导出
      if (exportDecl.source) {
        continue;
      }
      
      // export { a, b } - 本地导出（不是重导出）
      if (exportDecl.specifiers && exportDecl.specifiers.length > 0 && !exportDecl.declaration) {
        continue;
      }
      
      // export const/function/class - 有声明的导出
      if (exportDecl.declaration) {
        return false;
      }
      
      continue;
    }
    
    // 允许导入语句（用于重导出）
    if (statement.type === 'ImportDeclaration') {
      continue;
    }
    
    // 允许类型导出
    if (
      statement.type === 'TSTypeAliasDeclaration' ||
      statement.type === 'TSInterfaceDeclaration'
    ) {
      continue;
    }
    
    // 其他语句都是逻辑代码
    return false;
  }
  
  return true;
}

/**
 * 统计导出的组件/函数数量
 */
function countExportedComponents(body: TSESTree.Statement[]): number {
  let count = 0;
  
  for (const statement of body) {
    if (statement.type === 'ExportNamedDeclaration') {
      const exportDecl = statement as TSESTree.ExportNamedDeclaration;
      
      // 有声明的导出
      if (exportDecl.declaration) {
        if (
          exportDecl.declaration.type === 'FunctionDeclaration' ||
          exportDecl.declaration.type === 'ClassDeclaration'
        ) {
          count++;
        } else if (exportDecl.declaration.type === 'VariableDeclaration') {
          // 检查是否是组件（箭头函数）
          for (const decl of exportDecl.declaration.declarations) {
            if (
              decl.init?.type === 'ArrowFunctionExpression' ||
              decl.init?.type === 'FunctionExpression' ||
              decl.init?.type === 'CallExpression'  // memo(), forwardRef()
            ) {
              count++;
            }
          }
        }
      }
      
      // 命名导出
      if (exportDecl.specifiers && !exportDecl.source) {
        count += exportDecl.specifiers.length;
      }
    }
    
    if (statement.type === 'ExportDefaultDeclaration') {
      count++;
    }
  }
  
  return count;
}

/**
 * 检查是否有类型定义
 */
function hasTypeDefinitions(body: TSESTree.Statement[]): boolean {
  for (const statement of body) {
    if (
      statement.type === 'TSTypeAliasDeclaration' ||
      statement.type === 'TSInterfaceDeclaration' ||
      statement.type === 'TSEnumDeclaration'
    ) {
      // 检查是否导出
      return true;
    }
    
    if (statement.type === 'ExportNamedDeclaration') {
      const exportDecl = statement as TSESTree.ExportNamedDeclaration;
      if (
        exportDecl.declaration?.type === 'TSTypeAliasDeclaration' ||
        exportDecl.declaration?.type === 'TSInterfaceDeclaration' ||
        exportDecl.declaration?.type === 'TSEnumDeclaration'
      ) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 获取文件类型的中文描述
 */
function getFileTypeDescription(layer: ArchitectureLayer): string {
  const descriptions: Record<ArchitectureLayer, string> = {
    pipes: '管道文件应以 .pipe.ts 或 .fn.ts 结尾',
    flows: '流程文件应以 .flow.ts 或 .action.ts 结尾',
    io: 'IO 文件应以 .api.ts, .storage.ts 或 .file.ts 结尾',
    state: '状态文件应以 .state.ts 结尾',
    hooks: 'Hook 文件应以 use- 开头',
    utils: '工具文件应以 .util.ts 结尾',
    views: '视图文件应以 .view.fn.tsx 或 .container.fn.tsx 结尾',
    types: '类型文件应以 .interface.ts, .schema.ts 或 .types.ts 结尾',
    queries: '查询文件应以 .queries.ts 结尾',
    routes: '路由文件',
  };
  
  return descriptions[layer] || '';
}

export default createRule<[], MessageIds>({
  name: 'file-location',
  meta: {
    type: 'suggestion',
    docs: {
      description: '检测文件是否在正确的目录，以及 index.ts 是否只包含重导出',
    },
    messages: {
      indexFileLogic: `❌ index.ts 文件应该只包含重导出，不应包含业务逻辑

🔍 原因：
  index.ts 文件的职责是作为模块的入口点，只负责重导出。
  将逻辑代码放在 index.ts 中会导致：
  - 循环依赖问题
  - 代码组织混乱
  - 难以追踪代码位置

✅ 修复方案：
  1. 将逻辑代码移动到独立的文件
  2. 在 index.ts 中只保留 export 语句

📋 正确的 index.ts 示例：
  export { createNode } from './create-node.flow';
  export { updateNode } from './update-node.flow';
  export type { NodeCreateParams } from './types';

📚 参考文档：#structure - 目录结构`,

      multipleExports: `⚠️ 文件导出了多个组件/函数 ({{ count }} 个)

🔍 原因：
  每个文件应该只导出一个主要的组件或函数。
  多个导出会导致：
  - 文件职责不清晰
  - 难以维护和测试
  - 违反单一职责原则

✅ 修复方案：
  1. 将每个组件/函数拆分到独立的文件
  2. 使用 index.ts 统一导出

📚 参考文档：#code-standards - 文件组织`,

      typesInWrongFile: `⚠️ 类型定义应该放在 types/ 目录

🔍 原因：
  检测到在非 types/ 目录的文件中定义了类型。
  类型定义应该集中在 types/ 目录中，便于：
  - 类型复用
  - 避免循环依赖
  - 清晰的代码组织

✅ 修复方案：
  1. 将类型定义移动到 types/ 目录
  2. 在当前文件中导入类型

📚 参考文档：#structure - 类型层`,

      deepRelativeImport: `❌ 相对导入层级过深 ({{ depth }} 层)

🔍 原因：
  相对导入超过 2 层会导致：
  - 代码难以阅读
  - 重构时容易出错
  - 路径难以维护

✅ 修复方案：
  使用 @/ 别名替代深层相对导入

📋 示例：
  ❌ import { something } from '../../../utils/helper';
  ✅ import { something } from '@/utils/helper';

📚 参考文档：#code-standards - 导入规范`,

      wrongFileLocation: `⚠️ 文件命名不符合 {{ layer }}/ 层的规范

🔍 原因：
  {{ description }}

✅ 修复方案：
  重命名文件以符合命名规范

📋 示例：{{ example }}

📚 参考文档：#structure - 文件命名规范`,
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename;

    // 跳过测试文件
    if (isTestFile(filename)) {
      return {};
    }

    // 获取当前文件的架构层级
    const currentLayer = getArchitectureLayer(filename);
    
    // 跳过非架构层级的文件
    if (!currentLayer) {
      return {};
    }

    const basename = path.basename(filename);
    const isIndexFile = isIndexFilePattern(filename);

    return {
      Program(node: TSESTree.Program) {
        // 检查 index.ts 是否只包含重导出
        if (isIndexFile) {
          if (!hasOnlyReExports(node.body)) {
            context.report({
              node,
              messageId: 'indexFileLogic',
            });
          }
          return; // index.ts 不需要检查其他规则
        }

        // 检查文件是否导出了多个组件
        const exportCount = countExportedComponents(node.body);
        if (exportCount > 1) {
          context.report({
            node,
            messageId: 'multipleExports',
            data: { count: String(exportCount) },
          });
        }

        // 检查非 types/ 文件中的类型定义
        if (currentLayer !== 'types' && hasTypeDefinitions(node.body)) {
          // 只对导出的类型报告警告
          // 内部类型定义是允许的
          for (const statement of node.body) {
            if (
              statement.type === 'ExportNamedDeclaration' &&
              (statement.declaration?.type === 'TSTypeAliasDeclaration' ||
               statement.declaration?.type === 'TSInterfaceDeclaration' ||
               statement.declaration?.type === 'TSEnumDeclaration')
            ) {
              context.report({
                node: statement,
                messageId: 'typesInWrongFile',
              });
            }
          }
        }

        // 检查文件命名是否符合层级规范
        const pattern = FILE_NAMING_PATTERNS.find(p => p.layer === currentLayer);
        if (pattern && !pattern.pattern.test(basename)) {
          context.report({
            node,
            messageId: 'wrongFileLocation',
            data: {
              layer: currentLayer,
              description: getFileTypeDescription(currentLayer),
              example: pattern.example,
            },
          });
        }
      },

      // 检查深层相对导入
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;
        
        if (typeof importPath === 'string' && importPath.startsWith('.')) {
          const depth = getRelativeImportDepth(importPath);
          
          if (depth > 2) {
            context.report({
              node,
              messageId: 'deepRelativeImport',
              data: { depth: String(depth) },
            });
          }
        }
      },
    };
  },
});
