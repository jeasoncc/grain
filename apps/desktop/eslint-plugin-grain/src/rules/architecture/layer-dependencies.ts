/**
 * ESLint Rule: layer-dependencies
 * 架构层级依赖规则
 *
 * 强制执行 Grain 项目的分层架构依赖规则
 *
 * @requirements 2.1-2.12
 * @property Property 3: Architecture Layer Dependency Validation
 */

import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  getArchitectureLayer,
  getImportLayer,
  isContainerComponent,
  isViewComponent,
  isTestFile,
  isLayerViolation,
  getLayerViolationDetails,
  isDeprecatedDirectoryImport,
  getDeprecatedDirectoryMigration,
  getLayerChineseName,
  getLayerDescription,
  getAllowedDependencies,
} from '../../utils/architecture.js';
import {
  buildErrorMessage,
  getLayerViolationSuggestion,
} from '../../utils/message-builder.js';
import type { ArchitectureLayer } from '../../types/rule.types.js';
import { CONTAINER_EXTRA_DEPENDENCIES } from '../../types/config.types.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://grain.dev/eslint-rules/${name}`
);

type MessageIds =
  | 'layerViolation'
  | 'containerException'
  | 'viewStateViolation'
  | 'deprecatedImport'
  | 'pipesPurityViolation'
  | 'utilsPurityViolation'
  | 'hooksIoViolation';

type Options = [
  {
    strict?: boolean;
  }
];

export default createRule<Options, MessageIds>({
  name: 'layer-dependencies',
  meta: {
    type: 'problem',
    docs: {
      description: '强制执行架构层级依赖规则',
    },
    messages: {
      layerViolation: `❌ 架构层级违规：{{ currentLayer }}/ 层不能依赖 {{ importLayer }}/ 层

🔍 原因：
  当前文件位于 {{ currentLayerChinese }}，但导入了 {{ importLayerChinese }} 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  {{ currentLayer }}/ 只能依赖: {{ allowedLayers }}

✅ 修复建议：
{{ suggestion }}

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构`,

      containerException: `⚠️ views/ 层不能直接导入 {{ importLayer }}/

💡 建议：
  - 如果这是容器组件 (.container.fn.tsx)，可以导入 flows/ 和 state/
  - 如果这是视图组件 (.view.fn.tsx)，请通过 hooks/ 间接访问

✅ 正确做法：
  1. 将文件重命名为 *.container.fn.tsx（如果需要访问 flows/state）
  2. 或者创建 hook 封装逻辑

📚 参考文档：#architecture - 容器/视图分离`,

      viewStateViolation: `❌ 视图组件不能直接访问 state/

🔍 原因：
  视图组件 (.view.fn.tsx) 应该是纯展示组件，只接收 props。
  直接访问 state/ 会破坏组件的可测试性和可复用性。

✅ 修复方案：
  1. 通过 props 从容器组件传入状态
  2. 或者使用 hooks/ 封装状态访问

📋 正确的数据流：
  state/ → hooks/ → container/ → view/ (via props)

📚 参考文档：#code-standards - 组件规范`,

      deprecatedImport: `❌ 禁止从废弃目录导入：{{ directory }}/

🔍 原因：
  {{ directory }}/ 是废弃的目录结构，新代码不应依赖。

✅ 迁移建议：
  {{ directory }}/ 已迁移到 {{ migration }}

📚 参考文档：#structure - 目录结构`,

      pipesPurityViolation: `❌ pipes/ 层必须是纯函数，不能依赖 {{ importLayer }}/

🔍 原因：
  pipes/ 层只能包含纯数据转换函数，不能有任何副作用。
  依赖 {{ importLayer }}/ 会引入副作用或状态。

✅ 修复方案：
  - 将 IO 操作移动到 flows/ 层
  - 将状态作为参数传入，而不是直接访问

📋 正确的组合方式：
  flows/ 负责组合 pipes/ + io/

📚 参考文档：#architecture - 纯函数层`,

      utilsPurityViolation: `❌ utils/ 层必须是纯函数，不能依赖 {{ importLayer }}/

🔍 原因：
  utils/ 层只能包含通用工具函数，只能依赖 types/。

✅ 修复方案：
  - 如果需要业务逻辑，移动到 pipes/
  - 如果需要 IO，移动到 io/

📚 参考文档：#architecture - 工具层`,

      hooksIoViolation: `❌ hooks/ 层不能直接依赖 io/

🔍 原因：
  hooks/ 应该通过 flows/ 间接访问 IO 操作。
  或者使用 queries/ (TanStack Query) 进行数据获取。

✅ 修复方案：
  1. 创建 flow 封装 IO 操作
  2. 或使用 queries/ 进行数据获取

📋 正确的数据流：
  hooks/ → flows/ → io/
  hooks/ → queries/ → io/

📚 参考文档：#architecture - 绑定层`,
    },
    schema: [
      {
        type: 'object',
        properties: {
          strict: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ strict: true }],
  create(context, [options]) {
    const filename = context.filename || context.getFilename();
    const strict = options.strict ?? true;

    // 跳过测试文件
    if (isTestFile(filename)) {
      return {};
    }

    // 获取当前文件的架构层级
    const currentLayer = getArchitectureLayer(filename);
    if (!currentLayer) {
      return {};
    }

    const isContainer = isContainerComponent(filename);
    const isView = isViewComponent(filename);

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;

        // 检查废弃目录导入
        if (isDeprecatedDirectoryImport(importPath)) {
          const match = importPath.match(/@\/([^/]+)/);
          const directory = match ? match[1] : '';
          const migration = getDeprecatedDirectoryMigration(directory);

          context.report({
            node,
            messageId: 'deprecatedImport',
            data: {
              directory,
              migration,
            },
          });
          return;
        }

        // 获取导入的层级
        const importLayer = getImportLayer(importPath);
        if (!importLayer) {
          return;
        }

        // 检查层级违规
        if (isLayerViolation(currentLayer, importLayer, isContainer, strict)) {
          const details = getLayerViolationDetails(currentLayer, importLayer, strict);
          const suggestion = getLayerViolationSuggestion(currentLayer, importLayer);

          // 特殊情况：views 层的容器/视图区分
          if (currentLayer === 'views') {
            if (isView && importLayer === 'state') {
              context.report({
                node,
                messageId: 'viewStateViolation',
              });
              return;
            }

            if (!isContainer && (importLayer === 'flows' || importLayer === 'state')) {
              context.report({
                node,
                messageId: 'containerException',
                data: {
                  importLayer,
                },
              });
              return;
            }
          }

          // 特殊情况：pipes 层的纯函数要求
          if (currentLayer === 'pipes' && ['io', 'state', 'flows'].includes(importLayer)) {
            context.report({
              node,
              messageId: 'pipesPurityViolation',
              data: {
                importLayer,
              },
            });
            return;
          }

          // 特殊情况：utils 层的纯函数要求
          if (currentLayer === 'utils' && importLayer !== 'types') {
            context.report({
              node,
              messageId: 'utilsPurityViolation',
              data: {
                importLayer,
              },
            });
            return;
          }

          // 特殊情况：hooks 层不能直接访问 io
          if (currentLayer === 'hooks' && importLayer === 'io') {
            context.report({
              node,
              messageId: 'hooksIoViolation',
            });
            return;
          }

          // 通用层级违规
          const allowedDeps = getAllowedDependencies(currentLayer, strict);
          context.report({
            node,
            messageId: 'layerViolation',
            data: {
              currentLayer,
              importLayer,
              currentLayerChinese: getLayerChineseName(currentLayer),
              importLayerChinese: getLayerChineseName(importLayer),
              allowedLayers: allowedDeps.length > 0 ? allowedDeps.join(', ') : '无（只能依赖 types/）',
              suggestion,
            },
          });
        }
      },
    };
  },
});
