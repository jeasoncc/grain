# 设计文档：Lexical 编辑器重构

## 概述

本设计文档描述如何彻底重构桌面应用的 Lexical 编辑器系统，解决当前的内存溢出和页面卡死问题。

**核心目标：**
1. 删除所有现有编辑器组件，基于 Lexical Playground 重新实现
2. 实现多编辑器实例架构，每个文件独立编辑器
3. 通过 CSS visibility 控制编辑器切换，保留完整状态
4. 保留自定义的 @mentions 和 #[tags] 插件

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    StoryWorkspace                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 EditorTabs (标签栏)                   │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              MultiEditorContainer                    │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │  EditorInstance (Tab 1) - visible           │    │    │
│  │  │  ├── LexicalComposer                        │    │    │
│  │  │  ├── PlaygroundPlugins                      │    │    │
│  │  │  └── CustomPlugins (@mentions, #tags)       │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │  EditorInstance (Tab 2) - hidden            │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │  EditorInstance (Tab 3) - hidden            │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 组件结构

```
apps/desktop/src/
├── components/
│   ├── editor/                    # 新的编辑器目录
│   │   ├── Editor.tsx             # 主编辑器组件 (基于 Playground)
│   │   ├── EditorInstance.tsx     # 单个编辑器实例包装器
│   │   ├── MultiEditorContainer.tsx # 多编辑器容器
│   │   ├── nodes/                 # 节点定义
│   │   │   ├── index.ts           # 节点导出
│   │   │   ├── MentionNode.tsx    # @提及节点 (保留)
│   │   │   └── TagNode.tsx        # #标签节点 (保留)
│   │   ├── plugins/               # 插件
│   │   │   ├── index.ts           # 插件导出
│   │   │   ├── MentionsPlugin.tsx # @提及插件 (保留)
│   │   │   ├── MentionTooltipPlugin.tsx # 提及预览 (保留)
│   │   │   └── TagPickerPlugin.tsx # #标签插件 (保留)
│   │   ├── themes/                # 主题
│   │   │   └── EditorTheme.ts     # 编辑器主题
│   │   └── ui/                    # UI 组件
│   │       └── WikiHoverPreview.tsx # Wiki 预览 (保留)
│   └── workspace/
│       └── story-workspace.tsx    # 更新使用新编辑器
```

## 组件和接口

### MultiEditorContainer

多编辑器容器组件，管理所有打开的编辑器实例。

```typescript
interface MultiEditorContainerProps {
  /** 所有打开的标签页 */
  tabs: EditorTab[];
  /** 当前活动标签页 ID */
  activeTabId: string | null;
  /** 编辑器状态映射 */
  editorStates: Record<string, EditorInstanceState>;
  /** 内容变化回调 */
  onContentChange: (tabId: string, state: SerializedEditorState) => void;
  /** 滚动位置变化回调 */
  onScrollChange: (tabId: string, scrollTop: number) => void;
}
```

**关键实现：**
- 所有编辑器实例同时挂载在 DOM 中
- 使用 CSS `visibility: hidden/visible` 控制显示
- 隐藏的编辑器保留完整状态（光标、滚动、undo历史）

### EditorInstance

单个编辑器实例包装器。

```typescript
interface EditorInstanceProps {
  /** 标签页 ID */
  tabId: string;
  /** 初始内容 */
  initialState?: SerializedEditorState;
  /** 是否可见 */
  isVisible: boolean;
  /** 内容变化回调 */
  onContentChange: (state: SerializedEditorState) => void;
  /** 滚动位置变化回调 */
  onScrollChange: (scrollTop: number) => void;
}
```

### Editor (基于 Lexical Playground)

核心编辑器组件，基于 Lexical Playground 实现。

```typescript
interface EditorProps {
  /** 初始编辑器状态 */
  initialState?: SerializedEditorState;
  /** 内容变化回调 */
  onChange?: (state: SerializedEditorState) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否只读 */
  readOnly?: boolean;
}
```

**插件配置（精简版）：**
- RichTextPlugin - 富文本编辑
- HistoryPlugin - 撤销/重做
- MarkdownShortcutPlugin - Markdown 快捷键
- ListPlugin - 列表支持
- LinkPlugin - 链接支持
- FloatingTextFormatPlugin - 浮动格式工具栏
- MentionsPlugin - @提及 (自定义)
- MentionTooltipPlugin - 提及预览 (自定义)
- TagPickerPlugin - #标签 (自定义)

## 数据模型

### EditorTab (现有，保持不变)

```typescript
interface EditorTab {
  id: string;           // 唯一标识 (nodeId)
  projectId: string;    // 项目 ID
  nodeId: string;       // 节点 ID
  title: string;        // 标签标题
  type: "file" | "diary" | "canvas" | "folder";
  isDirty?: boolean;    // 是否有未保存更改
}
```

### EditorInstanceState (现有，保持不变)

```typescript
interface EditorInstanceState {
  serializedState: SerializedEditorState | null;
  selectionState?: {
    anchor: { key: string; offset: number };
    focus: { key: string; offset: number };
  };
  scrollTop: number;
  scrollLeft: number;
  isDirty: boolean;
  lastModified: number;
}
```



## 正确性属性

*属性是系统在所有有效执行中应该保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*

### Property 1: 标签切换状态保留往返

*对于任意* 编辑器标签和任意编辑状态（光标位置、滚动位置），切换到其他标签再切换回来后，编辑状态应该与切换前完全相同。

**验证: Requirements 3.2, 3.3**

### Property 2: 编辑器实例隔离

*对于任意* 两个打开的编辑器标签，在一个标签中执行的 undo/redo 操作不应该影响另一个标签的内容或历史记录。

**验证: Requirements 3.4**

### Property 3: Visibility 模式切换

*对于任意* 标签切换操作，DOM 中的编辑器元素数量应该保持不变，只有 CSS visibility 属性发生变化。

**验证: Requirements 4.1**

### Property 4: LRU 缓存清理

*对于任意* 超过 10 个标签的情况，最久未使用且未修改的编辑器状态应该被清理，而活动标签和有未保存更改的标签应该被保留。

**验证: Requirements 4.3**

### Property 5: 节点插入正确性

*对于任意* @mention 或 #[tag] 选择操作，编辑器内容应该包含正确类型的节点（MentionNode 或 TagNode），且节点数据与选择的条目匹配。

**验证: Requirements 5.2, 5.5**

### Property 6: Markdown 转换

*对于任意* 有效的 Markdown 语法输入（如 `# `, `**`, `- `），编辑器应该将其转换为对应的格式化节点（HeadingNode, 粗体文本, ListNode）。

**验证: Requirements 6.1**

### Property 7: Undo/Redo 往返

*对于任意* 编辑操作序列，执行 undo 后再执行 redo 应该恢复到 undo 之前的状态。

**验证: Requirements 6.3**

### Property 8: 自动保存触发

*对于任意* 内容变化，在配置的延迟时间后，保存回调应该被触发，且保存的内容与当前编辑器状态一致。

**验证: Requirements 6.4**

## 错误处理

### 编辑器初始化错误

- 如果 Lexical 初始化失败，显示错误边界组件
- 记录错误日志，不影响其他标签页

### 内容加载错误

- 如果文件内容解析失败，显示空编辑器
- 保留原始内容，避免数据丢失

### 保存错误

- 如果保存失败，显示错误提示
- 保持 isDirty 状态，允许重试

### 内存溢出保护

- 当编辑器数量超过阈值，自动清理最旧的非活动编辑器
- 保护有未保存更改的编辑器不被清理

## 测试策略

### 单元测试

使用 Vitest 进行单元测试：

1. **EditorInstanceState 管理测试**
   - 测试状态创建、更新、清理
   - 测试 LRU 缓存逻辑

2. **节点序列化测试**
   - 测试 MentionNode 序列化/反序列化
   - 测试 TagNode 序列化/反序列化

### 属性测试

使用 fast-check 进行属性测试：

1. **状态保留往返测试** (Property 1)
   - 生成随机编辑状态
   - 模拟标签切换
   - 验证状态恢复

2. **编辑器隔离测试** (Property 2)
   - 生成随机编辑操作
   - 在多个标签中执行
   - 验证隔离性

3. **Visibility 模式测试** (Property 3)
   - 生成随机标签切换序列
   - 验证 DOM 元素数量不变

4. **LRU 缓存测试** (Property 4)
   - 生成超过阈值的标签
   - 验证清理逻辑

5. **节点插入测试** (Property 5)
   - 生成随机 mention/tag 数据
   - 验证节点正确插入

6. **Markdown 转换测试** (Property 6)
   - 生成随机 Markdown 语法
   - 验证转换结果

7. **Undo/Redo 往返测试** (Property 7)
   - 生成随机编辑操作序列
   - 验证 undo/redo 正确性

8. **自动保存测试** (Property 8)
   - 生成随机内容变化
   - 验证保存触发

### 测试框架配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

```typescript
// 属性测试示例
import * as fc from 'fast-check';

// Property 1: 状态保留往返
test('标签切换应保留编辑状态', () => {
  fc.assert(
    fc.property(
      fc.record({
        scrollTop: fc.nat(10000),
        scrollLeft: fc.nat(1000),
        cursorOffset: fc.nat(1000),
      }),
      (state) => {
        // 设置状态 -> 切换标签 -> 切换回来 -> 验证状态
        // ...
        return restoredState.scrollTop === state.scrollTop &&
               restoredState.scrollLeft === state.scrollLeft;
      }
    ),
    { numRuns: 100 }
  );
});
```

## 删除文件清单

### 完全删除的目录

```
apps/desktop/src/components/blocks/rich-editor/
├── editor.tsx           # 删除
├── minimal-editor.tsx   # 删除
├── minimal-plugins.tsx  # 删除
├── nodes.ts             # 删除
├── novel-editor.tsx     # 删除
└── plugins.tsx          # 删除
```

### 部分删除的目录 (components/editor/)

**删除的文件：**
```
apps/desktop/src/components/editor/
├── context/
│   └── toolbar-context.tsx          # 删除
├── editor-hooks/
│   ├── use-debounce.ts              # 删除
│   ├── use-modal.tsx                # 删除
│   ├── use-report.ts                # 删除
│   └── use-update-toolbar.ts        # 删除
├── plugins/
│   ├── actions/                     # 整个目录删除
│   ├── embeds/                      # 整个目录删除
│   ├── picker/                      # 整个目录删除
│   ├── toolbar/                     # 整个目录删除
│   ├── auto-link-plugin.tsx         # 删除
│   ├── autocomplete-plugin.tsx      # 删除
│   ├── code-action-menu-plugin.tsx  # 删除
│   ├── code-highlight-plugin.tsx    # 删除
│   ├── component-picker-menu-plugin.tsx # 删除
│   ├── context-menu-plugin.tsx      # 删除
│   ├── drag-drop-paste-plugin.tsx   # 删除
│   ├── draggable-block-plugin.tsx   # 删除
│   ├── emoji-picker-plugin.tsx      # 删除
│   ├── emojis-plugin.tsx            # 删除
│   ├── excalidraw-plugin.tsx        # 删除
│   ├── floating-link-editor-plugin.tsx # 删除
│   ├── floating-text-format-plugin.tsx # 删除
│   ├── front-matter-plugin.tsx      # 删除
│   ├── images-plugin.tsx            # 删除
│   ├── keywords-plugin.tsx          # 删除
│   ├── layout-plugin.tsx            # 删除
│   ├── link-plugin.tsx              # 删除
│   ├── list-max-indent-level-plugin.tsx # 删除
│   ├── search-replace-plugin.tsx    # 删除
│   ├── tab-focus-plugin.tsx         # 删除
│   ├── table-plugin.tsx             # 删除
│   └── typing-pref-plugin.tsx       # 删除
├── nodes/
│   ├── embeds/                      # 整个目录删除
│   ├── autocomplete-node.tsx        # 删除
│   ├── emoji-node.tsx               # 删除
│   ├── excalidraw-node.tsx          # 删除
│   ├── front-matter-node.tsx        # 删除
│   ├── image-node.tsx               # 删除
│   ├── keyword-node.tsx             # 删除
│   ├── layout-container-node.tsx    # 删除
│   └── layout-item-node.tsx         # 删除
├── shared/                          # 整个目录删除
├── themes/                          # 整个目录删除
├── transformers/                    # 整个目录删除
└── utils/                           # 整个目录删除
```

**保留的文件：**
```
apps/desktop/src/components/editor/
├── plugins/
│   ├── mentions-plugin.tsx          # 保留 - @提及插件
│   ├── mention-tooltip-plugin.tsx   # 保留 - 提及预览插件
│   └── tag-picker-plugin.tsx        # 保留 - #标签插件
├── nodes/
│   ├── mention-node.tsx             # 保留 - 提及节点
│   └── tag-node.tsx                 # 保留 - 标签节点
└── editor-ui/
    └── wiki-hover-preview.tsx       # 保留 - Wiki 预览组件
```
