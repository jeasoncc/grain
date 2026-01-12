import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import { buildErrorMessage } from '../../utils/message-builder';
import { getArchitectureLayer, isViewComponent } from '../../utils/architecture';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

type MessageIds =
  | 'storeInView'
  | 'directMutation'
  | 'noSelector'
  | 'wrongLocation'
  | 'tooManyProperties';

export default createRule<[], MessageIds>({
  name: 'zustand-patterns',
  meta: {
    type: 'problem',
    docs: {
      description: '强制执行 Zustand 状态管理模式',
      recommended: 'error',
    },
    messages: {
      storeInView: buildErrorMessage({
        title: '禁止在 view 组件中直接访问 store',
        reason: `
  view 组件应该是纯展示组件，只接收 props。
  直接访问 store 会：
  - 破坏组件的可测试性
  - 违反单向数据流原则
  - 使组件与状态管理耦合`,
        correctExample: `// ✅ 正确：在 container 组件中访问 store
// sidebar.container.fn.tsx
import { useSidebarStore } from '@/state/sidebar.state';

export const SidebarContainer = () => {
  const isOpen = useSidebarStore(state => state.isOpen);
  const toggle = useSidebarStore(state => state.toggle);
  
  return <SidebarView isOpen={isOpen} onToggle={toggle} />;
};

// sidebar.view.fn.tsx
interface SidebarViewProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const SidebarView = memo(({ isOpen, onToggle }: SidebarViewProps) => {
  return <div>{/* UI */}</div>;
});`,
        incorrectExample: `// ❌ 错误：view 组件直接访问 store
// sidebar.view.fn.tsx
import { useSidebarStore } from '@/state/sidebar.state';

export const SidebarView = memo(() => {
  const isOpen = useSidebarStore(state => state.isOpen);
  return <div>{/* UI */}</div>;
});`,
        docRef: '#architecture - 容器/视图分离',
      }),
      directMutation: buildErrorMessage({
        title: '禁止在 store action 中直接变异状态',
        reason: `
  直接变异状态会：
  - 破坏 React 的变化检测
  - 导致组件不更新
  - 使状态变化难以追踪`,
        correctExample: `// ✅ 正确：使用 Immer 进行不可变更新
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface State {
  items: Item[];
  addItem: (item: Item) => void;
  updateItem: (id: string, updates: Partial<Item>) => void;
}

export const useStore = create<State>()(
  immer((set) => ({
    items: [],
    addItem: (item) =>
      set((state) => {
        state.items.push(item); // Immer 处理不可变性
      }),
    updateItem: (id, updates) =>
      set((state) => {
        const item = state.items.find(i => i.id === id);
        if (item) {
          Object.assign(item, updates); // Immer 处理不可变性
        }
      }),
  }))
);`,
        incorrectExample: `// ❌ 错误：直接变异状态
export const useStore = create<State>((set, get) => ({
  items: [],
  addItem: (item) => {
    get().items.push(item); // 直接变异
  },
}));`,
        docRef: '#state-management - Zustand + Immer',
      }),
      noSelector: buildErrorMessage({
        title: '必须使用 selector 访问 store',
        reason: `
  访问整个 store 会：
  - 导致不必要的重渲染
  - 降低性能
  - 使依赖关系不清晰`,
        correctExample: `// ✅ 正确：使用 selector
const isOpen = useSidebarStore(state => state.isOpen);
const toggle = useSidebarStore(state => state.toggle);

// 或使用 shallow 比较多个值
import { shallow } from 'zustand/shallow';
const { isOpen, toggle } = useSidebarStore(
  state => ({ isOpen: state.isOpen, toggle: state.toggle }),
  shallow
);`,
        incorrectExample: `// ❌ 错误：访问整个 store
const store = useSidebarStore();
const isOpen = store.isOpen;`,
        docRef: '#state-management - Selector 模式',
      }),
      wrongLocation: buildErrorMessage({
        title: 'store 必须定义在 state/ 目录',
        reason: `
  store 定义在其他位置会：
  - 破坏项目架构
  - 使状态管理分散
  - 难以维护和查找`,
        correctExample: `// ✅ 正确：在 state/ 目录定义 store
// src/state/sidebar.state.ts
import { create } from 'zustand';

export const useSidebarStore = create<State>((set) => ({
  // ...
}));`,
        incorrectExample: `// ❌ 错误：在其他目录定义 store
// src/views/sidebar/store.ts
import { create } from 'zustand';

export const useSidebarStore = create<State>((set) => ({
  // ...
}));`,
        docRef: '#structure - 目录结构',
      }),
      tooManyProperties: buildErrorMessage({
        title: 'store 状态属性过多（超过 10 个）',
        reason: `
  过多的状态属性表明：
  - store 职责不清晰
  - 应该拆分为多个 store
  - 违反单一职责原则`,
        correctExample: `// ✅ 正确：拆分为多个 store
// sidebar.state.ts
export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  activeTab: 'files',
  toggle: () => set(state => ({ isOpen: !state.isOpen })),
}));

// editor.state.ts
export const useEditorStore = create<EditorState>((set) => ({
  content: '',
  isDirty: false,
  setContent: (content) => set({ content, isDirty: true }),
}));`,
        incorrectExample: `// ❌ 错误：单个 store 包含过多状态
export const useAppStore = create<AppState>((set) => ({
  // 11+ 个状态属性
  sidebarOpen: false,
  activeTab: 'files',
  editorContent: '',
  isDirty: false,
  theme: 'light',
  fontSize: 14,
  // ... 更多属性
}));`,
        docRef: '#state-management - Store 拆分',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const filename = context.getFilename();
    const layer = getArchitectureLayer(filename);
    const isView = isViewComponent(filename);

    // Track if we're in a store definition file
    const isStateFile = filename.includes('/state/') && filename.endsWith('.state.ts');

    return {
      // 检测 view 组件中的 store 访问 (Requirement 27.1)
      CallExpression(node: TSESTree.CallExpression) {
        if (isView && node.callee.type === 'Identifier') {
          const calleeName = node.callee.name;
          // 检测 useXxxStore 调用
          if (calleeName.startsWith('use') && calleeName.endsWith('Store')) {
            context.report({
              node,
              messageId: 'storeInView',
            });
          }
        }

        // 检测没有使用 selector 的情况 (Requirement 27.3)
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name.startsWith('use') &&
          node.callee.name.endsWith('Store')
        ) {
          // 如果没有参数，说明访问整个 store
          if (node.arguments.length === 0) {
            context.report({
              node,
              messageId: 'noSelector',
            });
          }
        }
      },

      // 检测 store 定义位置 (Requirement 27.4)
      'CallExpression[callee.name="create"]'(node: TSESTree.CallExpression) {
        // 检测 zustand 的 create 调用
        const parent = node.parent;
        if (
          parent &&
          parent.type === 'VariableDeclarator' &&
          parent.id.type === 'Identifier' &&
          parent.id.name.startsWith('use') &&
          parent.id.name.endsWith('Store')
        ) {
          // 这是一个 store 定义
          if (!filename.includes('/state/') || !filename.endsWith('.state.ts')) {
            context.report({
              node,
              messageId: 'wrongLocation',
            });
          }
        }
      },

      // 检测 store 中的直接变异 (Requirement 27.2)
      'CallExpression[callee.name="create"] > ArrowFunctionExpression'(
        node: TSESTree.ArrowFunctionExpression
      ) {
        if (!isStateFile) return;

        // 检查是否使用了 immer middleware
        const parent = node.parent;
        if (
          parent &&
          parent.type === 'CallExpression' &&
          parent.callee.type === 'CallExpression'
        ) {
          // 检查是否有 immer 调用
          const outerCall = parent.callee;
          if (
            outerCall.callee.type === 'Identifier' &&
            outerCall.callee.name === 'immer'
          ) {
            // 使用了 immer，允许变异
            return;
          }
        }

        // 没有使用 immer，检测直接变异
        // 这里简化检测：查找 get() 调用后的属性访问和赋值
        const checkForMutation = (n: TSESTree.Node) => {
          if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 'get') {
            // 检查 get() 的父节点是否是成员访问
            const p = n.parent;
            if (p && p.type === 'MemberExpression') {
              const pp = p.parent;
              // 检查是否是赋值或调用变异方法
              if (
                pp &&
                (pp.type === 'AssignmentExpression' ||
                  (pp.type === 'CallExpression' &&
                    pp.callee.type === 'MemberExpression' &&
                    pp.callee.property.type === 'Identifier' &&
                    ['push', 'pop', 'shift', 'unshift', 'splice'].includes(
                      pp.callee.property.name
                    )))
              ) {
                context.report({
                  node: pp,
                  messageId: 'directMutation',
                });
              }
            }
          }
        };

        // 遍历函数体
        if (node.body.type === 'BlockStatement') {
          node.body.body.forEach((statement) => {
            context.getSourceCode().getTokens(statement).forEach((token) => {
              const tokenNode = context.getSourceCode().getNodeByRangeIndex(token.range[0]);
              if (tokenNode) {
                checkForMutation(tokenNode);
              }
            });
          });
        }
      },

      // 检测 store 状态属性数量 (Requirement 27.5)
      'Program:exit'() {
        if (!isStateFile) return;

        const sourceCode = context.getSourceCode();
        const ast = sourceCode.ast;

        // 查找 create 调用
        const findCreateCall = (n: TSESTree.Node): TSESTree.CallExpression | null => {
          if (
            n.type === 'CallExpression' &&
            n.callee.type === 'Identifier' &&
            n.callee.name === 'create'
          ) {
            return n;
          }
          // 递归查找子节点
          for (const key in n) {
            const child = (n as any)[key];
            if (child && typeof child === 'object') {
              if (Array.isArray(child)) {
                for (const item of child) {
                  if (item && typeof item === 'object') {
                    const result = findCreateCall(item);
                    if (result) return result;
                  }
                }
              } else {
                const result = findCreateCall(child);
                if (result) return result;
              }
            }
          }
          return null;
        };

        const createCall = findCreateCall(ast);
        if (!createCall) return;

        // 查找 store 对象定义
        const storeArg = createCall.arguments[0];
        if (!storeArg) return;

        let storeObject: TSESTree.ObjectExpression | null = null;

        if (storeArg.type === 'ArrowFunctionExpression') {
          if (storeArg.body.type === 'ObjectExpression') {
            storeObject = storeArg.body;
          } else if (
            storeArg.body.type === 'BlockStatement' &&
            storeArg.body.body.length > 0
          ) {
            const returnStmt = storeArg.body.body.find(
              (s) => s.type === 'ReturnStatement'
            ) as TSESTree.ReturnStatement | undefined;
            if (returnStmt?.argument?.type === 'ObjectExpression') {
              storeObject = returnStmt.argument;
            }
          }
        }

        if (!storeObject) return;

        // 计算状态属性数量（排除函数）
        const stateProperties = storeObject.properties.filter((prop) => {
          if (prop.type === 'Property' && prop.value.type !== 'ArrowFunctionExpression' && prop.value.type !== 'FunctionExpression') {
            return true;
          }
          return false;
        });

        if (stateProperties.length > 10) {
          context.report({
            node: storeObject,
            messageId: 'tooManyProperties',
          });
        }
      },
    };
  },
});
