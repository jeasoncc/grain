# 统一编辑器状态持久化 - 任务列表

## Phase 1：基础架构（2-3 天）

### Task 1.1：安装 react-freeze

```bash
cd apps/desktop
bun add react-freeze
```

**验收标准：**
- [ ] package.json 中有 react-freeze 依赖
- [ ] 类型定义正常

---

### Task 1.2：创建 EditorWithFreeze 组件

**文件：** `apps/desktop/src/components/editor-with-freeze/editor-with-freeze.view.fn.tsx`

```typescript
import { memo } from 'react';
import { Freeze } from 'react-freeze';

interface EditorWithFreezeProps {
  readonly isActive: boolean;
  readonly children: React.ReactNode;
}

export const EditorWithFreeze = memo(({ 
  isActive, 
  children 
}: EditorWithFreezeProps) => {
  return (
    <Freeze freeze={!isActive}>
      <div 
        className="absolute inset-0"
        style={{ 
          visibility: isActive ? 'visible' : 'hidden',
          pointerEvents: isActive ? 'auto' : 'none',
          zIndex: isActive ? 1 : -1,
        }}
      >
        {children}
      </div>
    </Freeze>
  );
});

EditorWithFreeze.displayName = 'EditorWithFreeze';
```

**验收标准：**
- [ ] 组件正确渲染
- [ ] 非活动时 freeze={true}
- [ ] 活动时 freeze={false}
- [ ] CSS 样式正确应用

---

### Task 1.3：创建 EditorWithFreeze 类型定义

**文件：** `apps/desktop/src/components/editor-with-freeze/editor-with-freeze.types.ts`

```typescript
export interface EditorWithFreezeProps {
  readonly isActive: boolean;
  readonly children: React.ReactNode;
}
```

**验收标准：**
- [ ] 类型定义完整
- [ ] 无 TypeScript 错误

---

### Task 1.4：创建 EditorWithFreeze 测试

**文件：** `apps/desktop/src/components/editor-with-freeze/editor-with-freeze.view.fn.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EditorWithFreeze } from './editor-with-freeze.view.fn';

describe('EditorWithFreeze', () => {
  it('should render children when active', () => {
    render(
      <EditorWithFreeze isActive={true}>
        <div data-testid="child">Test Content</div>
      </EditorWithFreeze>
    );
    
    const child = screen.getByTestId('child');
    expect(child).toBeVisible();
  });
  
  it('should hide children when inactive', () => {
    render(
      <EditorWithFreeze isActive={false}>
        <div data-testid="child">Test Content</div>
      </EditorWithFreeze>
    );
    
    const child = screen.getByTestId('child');
    expect(child).toHaveStyle({ visibility: 'hidden' });
  });
});
```

**验收标准：**
- [ ] 所有测试通过
- [ ] 覆盖率 > 90%

---

### Task 1.5：创建 EditorWithFreeze index.ts

**文件：** `apps/desktop/src/components/editor-with-freeze/index.ts`

```typescript
export { EditorWithFreeze } from './editor-with-freeze.view.fn';
export type { EditorWithFreezeProps } from './editor-with-freeze.types';
```

**验收标准：**
- [ ] 导出正确
- [ ] 无 TypeScript 错误

---

## Phase 2：创建 LexicalEditorInstance（2-3 天）

### Task 2.1：创建 LexicalEditorInstance 组件

**文件：** `apps/desktop/src/components/lexical-editor/lexical-editor-instance.container.fn.tsx`

```typescript
import { Editor } from '@grain/editor';
import { memo, useCallback, useMemo } from 'react';
import { useUnifiedSave } from '@/hooks/use-unified-save';
import { useEditorTabsStore } from '@/stores/editor-tabs.store';
import { useWikiFiles } from '@/hooks/use-wiki';
import { useWikiHoverPreview } from '@/hooks/use-wiki-hover-preview';
import { WikiHoverPreviewConnected } from '@/components/blocks/wiki-hover-preview-connected';

interface LexicalEditorInstanceProps {
  readonly nodeId: string;
  readonly tabId: string;
  readonly workspaceId: string;
}

export const LexicalEditorInstance = memo(({ 
  nodeId, 
  tabId,
  workspaceId,
}: LexicalEditorInstanceProps) => {
  const editorStates = useEditorTabsStore(s => s.editorStates);
  const updateEditorState = useEditorTabsStore(s => s.updateEditorState);
  
  const state = editorStates[tabId];
  
  // Wiki 数据（用于 @ 提及）
  const wikiFiles = useWikiFiles(workspaceId);
  const mentionEntries = useMemo(
    () => wikiFiles.map(file => ({
      id: file.id,
      name: file.name,
      alias: file.alias,
    })),
    [wikiFiles],
  );
  
  // 使用统一保存逻辑
  const { updateContent } = useUnifiedSave({
    nodeId,
    contentType: 'lexical',
    tabId,
  });
  
  const handleChange = useCallback((serializedState) => {
    updateEditorState(tabId, { serializedState });
    updateContent(JSON.stringify(serializedState));
  }, [tabId, updateEditorState, updateContent]);
  
  const handleScrollChange = useCallback((scrollTop: number) => {
    updateEditorState(tabId, { scrollTop });
  }, [tabId, updateEditorState]);
  
  return (
    <div className="h-full w-full overflow-auto">
      <Editor
        initialState={state?.serializedState}
        onChange={handleChange}
        onScrollChange={handleScrollChange}
        placeholder="Start writing..."
        namespace={`editor-${tabId}`}
        mentionEntries={mentionEntries}
        useWikiHoverPreview={useWikiHoverPreview}
        WikiHoverPreview={WikiHoverPreviewConnected}
      />
    </div>
  );
});

LexicalEditorInstance.displayName = 'LexicalEditorInstance';
```

**验收标准：**
- [ ] 组件正确渲染
- [ ] useUnifiedSave 正常工作
- [ ] Wiki 提及功能正常
- [ ] 滚动位置保存正常

---

### Task 2.2：创建 LexicalEditorInstance 类型定义

**文件：** `apps/desktop/src/components/lexical-editor/lexical-editor-instance.types.ts`

```typescript
export interface LexicalEditorInstanceProps {
  readonly nodeId: string;
  readonly tabId: string;
  readonly workspaceId: string;
}
```

**验收标准：**
- [ ] 类型定义完整
- [ ] 无 TypeScript 错误

---

### Task 2.3：创建 LexicalEditorInstance 测试

**文件：** `apps/desktop/src/components/lexical-editor/lexical-editor-instance.container.fn.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LexicalEditorInstance } from './lexical-editor-instance.container.fn';

// Mock dependencies
vi.mock('@/hooks/use-unified-save');
vi.mock('@/hooks/use-wiki');
vi.mock('@/stores/editor-tabs.store');

describe('LexicalEditorInstance', () => {
  it('should render editor', () => {
    render(
      <LexicalEditorInstance
        nodeId="node-1"
        tabId="tab-1"
        workspaceId="workspace-1"
      />
    );
    
    // 验证编辑器渲染
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
  
  it('should call updateContent on change', () => {
    const updateContent = vi.fn();
    vi.mocked(useUnifiedSave).mockReturnValue({ updateContent });
    
    render(
      <LexicalEditorInstance
        nodeId="node-1"
        tabId="tab-1"
        workspaceId="workspace-1"
      />
    );
    
    // 触发内容变化
    // ...
    
    expect(updateContent).toHaveBeenCalled();
  });
});
```

**验收标准：**
- [ ] 所有测试通过
- [ ] 覆盖率 > 90%

---

### Task 2.4：创建 LexicalEditorInstance index.ts

**文件：** `apps/desktop/src/components/lexical-editor/index.ts`

```typescript
export { LexicalEditorInstance } from './lexical-editor-instance.container.fn';
export type { LexicalEditorInstanceProps } from './lexical-editor-instance.types';
```

**验收标准：**
- [ ] 导出正确
- [ ] 无 TypeScript 错误

---

## Phase 3：重构 StoryWorkspaceContainer（2-3 天）

### Task 3.1：重构 StoryWorkspaceContainer

**文件：** `apps/desktop/src/components/story-workspace/story-workspace.container.fn.tsx`

**关键改动：**

1. 添加 tabs 分组逻辑
2. 移除 MultiEditorContainer
3. 使用 EditorWithFreeze 包装所有编辑器
4. 移除 key={activeTab.id}

**验收标准：**
- [ ] 所有编辑器使用 EditorWithFreeze
- [ ] 移除 MultiEditorContainer 引用
- [ ] 移除 key={activeTab.id}
- [ ] 所有编辑器同时渲染
- [ ] Tab 切换正常工作

---

### Task 3.2：删除 MultiEditorContainer

**文件：**
- `packages/editor/src/components/MultiEditorContainer.tsx`
- `packages/editor/src/components/EditorInstance.tsx`

**验收标准：**
- [ ] 文件已删除
- [ ] 无引用残留
- [ ] 无 TypeScript 错误

---

### Task 3.3：更新 packages/editor/src/index.ts

移除 MultiEditorContainer 和 EditorInstance 的导出。

**验收标准：**
- [ ] 导出已移除
- [ ] 无 TypeScript 错误

---

## Phase 4：测试与优化（2-3 天）

### Task 4.1：集成测试

**文件：** `apps/desktop/src/components/story-workspace/story-workspace.integration.test.tsx`

测试场景：
- [ ] Tab 切换测试
- [ ] 状态保留测试（所有编辑器）
- [ ] 保存功能测试
- [ ] 多编辑器协同测试

---

### Task 4.2：性能测试

**文件：** `apps/desktop/src/components/story-workspace/story-workspace.performance.test.ts`

测试指标：
- [ ] Tab 切换耗时 < 16ms
- [ ] 内存占用 < 500MB (10 tabs)
- [ ] reconciliation 次数 = 0（冻结时）

---

### Task 4.3：边界情况测试

测试场景：
- [ ] 快速切换多个 tabs
- [ ] 打开大量 tabs（> 20）
- [ ] 编辑器内容很大时的性能
- [ ] 同时编辑多个 tabs

---

### Task 4.4：代码审查与优化

- [ ] 代码符合 architecture.md
- [ ] 代码符合 code-standards.md
- [ ] 代码符合 design-patterns.md
- [ ] 无 TypeScript 错误
- [ ] 无 Biome lint 错误
- [ ] 测试覆盖率 > 90%

---

## Phase 5：文档与发布（1 天）

### Task 5.1：更新文档

- [ ] 更新 README.md
- [ ] 更新 CHANGELOG.md
- [ ] 更新相关 spec 文档

---

### Task 5.2：Git Commit

```bash
git add -A
git commit -m "refactor: 统一编辑器状态管理，使用 react-freeze 替代 MultiEditorContainer"
```

**验收标准：**
- [ ] Commit message 符合规范
- [ ] 所有测试通过
- [ ] 无功能回归

---

## 总体验收标准

### 功能性

- [ ] 所有编辑器切换时状态保留
- [ ] Lexical：光标位置、滚动位置、撤销历史保留
- [ ] Excalidraw：画布状态（缩放、平移、选中元素）保留
- [ ] Code：光标位置、滚动位置保留
- [ ] Diagram：渲染结果保留
- [ ] useUnifiedSave 正常工作（自动保存、手动保存）

### 性能

- [ ] Tab 切换耗时 < 16ms
- [ ] 内存占用 < 500MB (10 tabs)
- [ ] 无明显卡顿或延迟

### 质量

- [ ] 单元测试覆盖率 > 90%
- [ ] 集成测试通过
- [ ] 性能测试通过
- [ ] 无 TypeScript 错误
- [ ] 无 Biome lint 错误
- [ ] 符合函数式架构原则

---

## 时间估算

| Phase | 任务 | 时间 |
|-------|------|------|
| Phase 1 | 基础架构 | 2-3 天 |
| Phase 2 | LexicalEditorInstance | 2-3 天 |
| Phase 3 | 重构 StoryWorkspace | 2-3 天 |
| Phase 4 | 测试与优化 | 2-3 天 |
| Phase 5 | 文档与发布 | 1 天 |
| **总计** | | **9-13 天** |
