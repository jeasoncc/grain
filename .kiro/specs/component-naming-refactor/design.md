# Design Document

## 1. 组件分析

### 1.1 当前组件结构

```
components/
├── activity-bar/              # ✅ 已有 View/Container 结构
│   ├── activity-bar-view.tsx
│   ├── activity-bar-container.tsx
│   ├── activity-bar.types.ts
│   └── index.ts
│
├── blocks/                    # 🔴 需要重构
│   ├── wiki-hover-preview.tsx           # View
│   ├── wiki-hover-preview-connected.tsx # Container
│   ├── global-search.tsx                # View
│   ├── global-search-connected.tsx      # Container
│   ├── backup-manager.tsx               # 混合
│   ├── canvas-editor.tsx                # 混合
│   ├── export-dialog.tsx                # 混合
│   ├── keyboard-shortcuts-help.tsx      # View
│   ├── save-status-indicator.tsx        # View
│   ├── theme-selector.tsx               # 混合
│   ├── update-checker.tsx               # 混合
│   └── word-count-badge.tsx             # View
│
├── drawing/                   # 🔴 需要重构
│   └── drawing-workspace.tsx            # 混合
│
├── export/                    # 🔴 需要重构
│   ├── export-button.tsx                # 混合
│   └── export-dialog-manager.tsx        # Container
│
├── file-tree/                 # 🔴 需要重构
│   ├── file-tree.tsx                    # View
│   ├── file-tree-item.tsx               # View
│   └── index.ts
│
├── panels/                    # 🔴 需要重构
│   ├── drawings-panel.tsx               # 混合
│   ├── file-tree-panel.tsx              # Container
│   ├── search-panel.tsx                 # 混合
│   └── tag-graph-panel.tsx              # 混合
│
├── workspace/                 # 🔴 需要重构
│   └── story-workspace.tsx              # Container
│
├── ui/                        # ⚪ 不修改 (shadcn/ui)
│
└── 根级组件                    # 🔴 需要重构
    ├── buffer-switcher.tsx              # 混合
    ├── command-palette.tsx              # 混合
    ├── devtools-wrapper.tsx             # 工具
    ├── editor-tabs.tsx                  # 混合
    ├── font-style-injector.tsx          # 工具
    ├── story-right-sidebar.tsx          # 混合
    └── unified-sidebar.tsx              # 混合
```

### 1.2 组件分类

| 类型 | 说明 | 处理方式 |
|------|------|----------|
| **View** | 纯展示，只接收 props | 重命名为 `.view.fn.tsx` |
| **Container** | 连接 hooks/stores | 重命名为 `.container.fn.tsx` |
| **混合** | 既有展示又有数据逻辑 | 拆分为 View + Container |
| **工具** | 非展示组件（注入器等） | 保持原样或重命名为 `.util.tsx` |

## 2. 目标结构

### 2.1 目录结构

```
components/
├── activity-bar/
│   ├── activity-bar.view.fn.tsx
│   ├── activity-bar.view.fn.test.tsx
│   ├── activity-bar.container.fn.tsx
│   ├── activity-bar.container.fn.test.tsx
│   ├── activity-bar.types.ts
│   └── index.ts
│
├── wiki-hover-preview/
│   ├── wiki-hover-preview.view.fn.tsx
│   ├── wiki-hover-preview.view.fn.test.tsx
│   ├── wiki-hover-preview.container.fn.tsx
│   ├── wiki-hover-preview.container.fn.test.tsx
│   ├── wiki-hover-preview.types.ts
│   └── index.ts
│
├── global-search/
│   ├── global-search.view.fn.tsx
│   ├── global-search.view.fn.test.tsx
│   ├── global-search.container.fn.tsx
│   ├── global-search.container.fn.test.tsx
│   ├── global-search.types.ts
│   └── index.ts
│
├── backup-manager/
│   ├── backup-manager.view.fn.tsx
│   ├── backup-manager.view.fn.test.tsx
│   ├── backup-manager.container.fn.tsx
│   ├── backup-manager.container.fn.test.tsx
│   ├── backup-manager.types.ts
│   └── index.ts
│
├── canvas-editor/
│   ├── canvas-editor.view.fn.tsx
│   ├── canvas-editor.view.fn.test.tsx
│   ├── canvas-editor.container.fn.tsx
│   ├── canvas-editor.container.fn.test.tsx
│   ├── canvas-editor.types.ts
│   └── index.ts
│
├── export-dialog/
│   ├── export-dialog.view.fn.tsx
│   ├── export-dialog.view.fn.test.tsx
│   ├── export-dialog.container.fn.tsx
│   ├── export-dialog.container.fn.test.tsx
│   ├── export-dialog.types.ts
│   └── index.ts
│
├── keyboard-shortcuts-help/
│   ├── keyboard-shortcuts-help.view.fn.tsx
│   ├── keyboard-shortcuts-help.view.fn.test.tsx
│   ├── keyboard-shortcuts-help.types.ts
│   └── index.ts
│
├── save-status-indicator/
│   ├── save-status-indicator.view.fn.tsx
│   ├── save-status-indicator.view.fn.test.tsx
│   ├── save-status-indicator.types.ts
│   └── index.ts
│
├── theme-selector/
│   ├── theme-selector.view.fn.tsx
│   ├── theme-selector.view.fn.test.tsx
│   ├── theme-selector.container.fn.tsx
│   ├── theme-selector.container.fn.test.tsx
│   ├── theme-selector.types.ts
│   └── index.ts
│
├── update-checker/
│   ├── update-checker.view.fn.tsx
│   ├── update-checker.view.fn.test.tsx
│   ├── update-checker.container.fn.tsx
│   ├── update-checker.container.fn.test.tsx
│   ├── update-checker.types.ts
│   └── index.ts
│
├── word-count-badge/
│   ├── word-count-badge.view.fn.tsx
│   ├── word-count-badge.view.fn.test.tsx
│   ├── word-count-badge.types.ts
│   └── index.ts
│
├── drawing-workspace/
│   ├── drawing-workspace.view.fn.tsx
│   ├── drawing-workspace.view.fn.test.tsx
│   ├── drawing-workspace.container.fn.tsx
│   ├── drawing-workspace.container.fn.test.tsx
│   ├── drawing-workspace.types.ts
│   └── index.ts
│
├── export-button/
│   ├── export-button.view.fn.tsx
│   ├── export-button.view.fn.test.tsx
│   ├── export-button.container.fn.tsx
│   ├── export-button.container.fn.test.tsx
│   ├── export-button.types.ts
│   └── index.ts
│
├── export-dialog-manager/
│   ├── export-dialog-manager.container.fn.tsx
│   ├── export-dialog-manager.container.fn.test.tsx
│   ├── export-dialog-manager.types.ts
│   └── index.ts
│
├── file-tree/
│   ├── file-tree.view.fn.tsx
│   ├── file-tree.view.fn.test.tsx
│   ├── file-tree.container.fn.tsx
│   ├── file-tree.container.fn.test.tsx
│   ├── file-tree-item.view.fn.tsx
│   ├── file-tree-item.view.fn.test.tsx
│   ├── file-tree.types.ts
│   └── index.ts
│
├── panels/
│   ├── drawings-panel/
│   │   ├── drawings-panel.view.fn.tsx
│   │   ├── drawings-panel.view.fn.test.tsx
│   │   ├── drawings-panel.container.fn.tsx
│   │   ├── drawings-panel.container.fn.test.tsx
│   │   ├── drawings-panel.types.ts
│   │   └── index.ts
│   ├── file-tree-panel/
│   │   ├── file-tree-panel.container.fn.tsx
│   │   ├── file-tree-panel.container.fn.test.tsx
│   │   ├── file-tree-panel.types.ts
│   │   └── index.ts
│   ├── search-panel/
│   │   ├── search-panel.view.fn.tsx
│   │   ├── search-panel.view.fn.test.tsx
│   │   ├── search-panel.container.fn.tsx
│   │   ├── search-panel.container.fn.test.tsx
│   │   ├── search-panel.types.ts
│   │   └── index.ts
│   └── tag-graph-panel/
│       ├── tag-graph-panel.view.fn.tsx
│       ├── tag-graph-panel.view.fn.test.tsx
│       ├── tag-graph-panel.container.fn.tsx
│       ├── tag-graph-panel.container.fn.test.tsx
│       ├── tag-graph-panel.types.ts
│       └── index.ts
│
├── story-workspace/
│   ├── story-workspace.container.fn.tsx
│   ├── story-workspace.container.fn.test.tsx
│   ├── story-workspace.types.ts
│   └── index.ts
│
├── buffer-switcher/
│   ├── buffer-switcher.view.fn.tsx
│   ├── buffer-switcher.view.fn.test.tsx
│   ├── buffer-switcher.container.fn.tsx
│   ├── buffer-switcher.container.fn.test.tsx
│   ├── buffer-switcher.types.ts
│   └── index.ts
│
├── command-palette/
│   ├── command-palette.view.fn.tsx
│   ├── command-palette.view.fn.test.tsx
│   ├── command-palette.container.fn.tsx
│   ├── command-palette.container.fn.test.tsx
│   ├── command-palette.types.ts
│   └── index.ts
│
├── editor-tabs/
│   ├── editor-tabs.view.fn.tsx
│   ├── editor-tabs.view.fn.test.tsx
│   ├── editor-tabs.container.fn.tsx
│   ├── editor-tabs.container.fn.test.tsx
│   ├── editor-tabs.types.ts
│   └── index.ts
│
├── story-right-sidebar/
│   ├── story-right-sidebar.view.fn.tsx
│   ├── story-right-sidebar.view.fn.test.tsx
│   ├── story-right-sidebar.container.fn.tsx
│   ├── story-right-sidebar.container.fn.test.tsx
│   ├── story-right-sidebar.types.ts
│   └── index.ts
│
├── unified-sidebar/
│   ├── unified-sidebar.view.fn.tsx
│   ├── unified-sidebar.view.fn.test.tsx
│   ├── unified-sidebar.container.fn.tsx
│   ├── unified-sidebar.container.fn.test.tsx
│   ├── unified-sidebar.types.ts
│   └── index.ts
│
├── utils/                     # 工具组件
│   ├── devtools-wrapper.tsx
│   └── font-style-injector.tsx
│
└── ui/                        # shadcn/ui（不修改）
```

## 3. 迁移策略

### 3.1 迁移优先级

| 优先级 | 组件 | 原因 |
|--------|------|------|
| 🔴 高 | activity-bar | 已有结构，只需重命名 |
| 🔴 高 | wiki-hover-preview | 已有 View/Container 分离 |
| 🔴 高 | global-search | 已有 View/Container 分离 |
| 🔴 高 | file-tree | 核心组件，已是纯展示 |
| 🟡 中 | panels/* | 需要拆分 |
| 🟡 中 | blocks/* | 需要拆分 |
| 🟡 中 | 根级组件 | 需要移动到目录 |
| 🟢 低 | workspace/* | 主要是 Container |

### 3.2 迁移步骤

每个组件的迁移步骤：

1. **分析组件** - 确定是 View、Container 还是混合
2. **创建目录** - 如果组件不在独立目录中
3. **拆分组件** - 如果是混合组件
4. **重命名文件** - 应用新的命名规范
5. **创建类型文件** - 提取 Props 类型
6. **更新 index.ts** - 统一导出
7. **更新导入** - 更新所有引用此组件的文件
8. **验证** - 运行类型检查和测试

### 3.3 View 组件模板

```typescript
// xxx.view.fn.tsx
import { memo } from "react";
import type { XxxViewProps } from "./xxx.types";

export const XxxView = memo(({ prop1, prop2, onAction }: XxxViewProps) => {
  // 只允许 UI 状态
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div>
      {/* 纯展示逻辑 */}
    </div>
  );
});

XxxView.displayName = "XxxView";
```

### 3.4 Container 组件模板

```typescript
// xxx.container.fn.tsx
import { memo, useCallback } from "react";
import { XxxView } from "./xxx.view.fn";
import { useXxxStore } from "@/stores/xxx.store";
import { useXxx } from "@/hooks/use-xxx";

export const XxxContainer = memo(() => {
  // 连接 hooks 和 stores
  const data = useXxx();
  const { state, setState } = useXxxStore();
  
  // 处理回调
  const handleAction = useCallback(() => {
    // 业务逻辑
  }, []);
  
  return (
    <XxxView
      data={data}
      state={state}
      onAction={handleAction}
    />
  );
});

XxxContainer.displayName = "XxxContainer";
```

### 3.5 Types 文件模板

```typescript
// xxx.types.ts
export interface XxxViewProps {
  readonly data: DataType;
  readonly state: StateType;
  readonly onAction: () => void;
}

export interface XxxContainerProps {
  // Container 通常不需要 props，但如果需要可以定义
}
```

### 3.6 Index 文件模板

```typescript
// index.ts
export { XxxView } from "./xxx.view.fn";
export { XxxContainer } from "./xxx.container.fn";
export { XxxContainer as Xxx } from "./xxx.container.fn"; // 默认导出 Container
export type { XxxViewProps, XxxContainerProps } from "./xxx.types";
```

### 3.7 测试文件模板

**View 组件测试：**

```typescript
// xxx.view.fn.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { XxxView } from './xxx.view.fn';
import type { XxxViewProps } from './xxx.types';

describe('XxxView', () => {
  const defaultProps: XxxViewProps = {
    data: [],
    onAction: vi.fn(),
  };

  it('should render with props', () => {
    render(<XxxView {...defaultProps} />);
    expect(screen.getByRole('...')).toBeInTheDocument();
  });

  it('should call onAction when clicked', () => {
    const onAction = vi.fn();
    render(<XxxView {...defaultProps} onAction={onAction} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onAction).toHaveBeenCalled();
  });

  it('should handle conditional rendering', () => {
    render(<XxxView {...defaultProps} data={[]} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });
});
```

**Container 组件测试：**

```typescript
// xxx.container.fn.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { XxxContainer } from './xxx.container.fn';

// Mock hooks and stores
vi.mock('@/hooks/use-xxx', () => ({
  useXxx: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/stores/xxx.store', () => ({
  useXxxStore: vi.fn(() => ({ state: 'idle', setState: vi.fn() })),
}));

describe('XxxContainer', () => {
  it('should fetch data and pass to view', () => {
    render(<XxxContainer />);
    expect(screen.getByRole('...')).toBeInTheDocument();
  });

  it('should handle callbacks', () => {
    const { useXxxStore } = await import('@/stores/xxx.store');
    const setState = vi.fn();
    vi.mocked(useXxxStore).mockReturnValue({ state: 'idle', setState });
    
    render(<XxxContainer />);
    fireEvent.click(screen.getByRole('button'));
    expect(setState).toHaveBeenCalled();
  });
});
```

## 4. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 导入路径更新遗漏 | 高 | 使用 TypeScript 检查 |
| 组件拆分不当 | 中 | 遵循 View/Container 原则 |
| 测试失败 | 中 | 每个组件迁移后运行测试 |
| 运行时错误 | 高 | 启动应用进行验证 |

## 5. 验收标准

1. ✅ 所有组件遵循新的命名规范
2. ✅ 所有组件有独立的目录
3. ✅ 所有组件有 types 文件
4. ✅ 所有组件有 index.ts 统一导出
5. ✅ TypeScript 类型检查通过
6. ✅ 所有测试通过
7. ✅ 应用正常启动
8. ✅ ui/ 目录未被修改
