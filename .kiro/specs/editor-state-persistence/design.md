# 统一编辑器状态持久化 - 设计文档

## 架构概览

### 当前架构（混合方案）

```
StoryWorkspaceContainer
├── MultiEditorContainer (Lexical 专用)
│   ├── 使用 CSS visibility 管理多个 Lexical 实例
│   └── ✅ 状态保留完美
│
├── ExcalidrawEditor
│   ├── key={activeTab.id} ← 问题：切换时销毁重建
│   └── ❌ 画布状态丢失
│
├── CodeEditor
│   ├── key={activeTab.id} ← 问题：切换时销毁重建
│   └── ❌ 光标位置、滚动位置丢失
│
└── DiagramEditor
    ├── key={activeTab.id} ← 问题：切换时销毁重建
    └── ❌ 渲染结果丢失
```

### 目标架构（统一方案）

```
StoryWorkspaceContainer
└── UnifiedEditorPool
    ├── 所有编辑器同时渲染
    ├── 使用 react-freeze 统一冻结机制
    └── 使用 CSS 控制显示/隐藏
    
    ├── Lexical 编辑器池
    │   {lexicalTabs.map(tab => (
    │     <EditorWithFreeze isActive={tab.id === activeTabId}>
    │       <LexicalEditorInstance nodeId={tab.nodeId} tabId={tab.id} />
    │     </EditorWithFreeze>
    │   ))}
    │
    ├── Excalidraw 编辑器池
    │   {excalidrawTabs.map(tab => (
    │     <EditorWithFreeze isActive={tab.id === activeTabId}>
    │       <ExcalidrawEditorContainer nodeId={tab.nodeId} />
    │     </EditorWithFreeze>
    │   ))}
    │
    ├── Code 编辑器池
    │   {codeTabs.map(tab => (
    │     <EditorWithFreeze isActive={tab.id === activeTabId}>
    │       <CodeEditorContainer nodeId={tab.nodeId} />
    │     </EditorWithFreeze>
    │   ))}
    │
    └── Diagram 编辑器池
        {diagramTabs.map(tab => (
          <EditorWithFreeze isActive={tab.id === activeTabId}>
            <DiagramEditorContainer nodeId={tab.nodeId} diagramType={...} />
          </EditorWithFreeze>
        ))}
```

## 核心组件设计

### 1. EditorWithFreeze（通用包装器）

**文件**: `apps/desktop/src/components/editor-with-freeze/editor-with-freeze.view.fn.tsx`

```typescript
import { memo } from 'react';
import { Freeze } from 'react-freeze';

interface EditorWithFreezeProps {
  readonly isActive: boolean;
  readonly children: React.ReactNode;
}

/**
 * 带 Freeze 的编辑器包装器
 * 
 * 职责：
 * - 使用 react-freeze 冻结非活动编辑器
 * - 使用 CSS 控制显示/隐藏
 * - 使用 z-index 控制层级
 */
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

### 2. LexicalEditorInstance（新增）

**文件**: `apps/desktop/src/components/lexical-editor/lexical-editor-instance.container.fn.tsx`

```typescript
import { Editor } from '@grain/editor';
import { memo, useCallback } from 'react';
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

/**
 * Lexical 编辑器实例
 * 
 * 替代 MultiEditorContainer 中的 EditorInstance
 * 每个 tab 对应一个独立的 Lexical 编辑器实例
 */
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

### 3. StoryWorkspaceContainer（重构）

**文件**: `apps/desktop/src/components/story-workspace/story-workspace.container.fn.tsx`

**关键改动**：

```typescript
// 按类型分组 tabs
const lexicalTabs = useMemo(
  () => tabs.filter(t => getEditorTypeByFilename(t.title) === 'lexical'),
  [tabs]
);

const excalidrawTabs = useMemo(
  () => tabs.filter(t => getEditorTypeByFilename(t.title) === 'excalidraw'),
  [tabs]
);

const codeTabs = useMemo(
  () => tabs.filter(t => getEditorTypeByFilename(t.title) === 'code'),
  [tabs]
);

const diagramTabs = useMemo(
  () => tabs.filter(t => getEditorTypeByFilename(t.title) === 'diagram'),
  [tabs]
);

const renderEditorContent = () => {
  if (!activeTab) {
    return <EmptyState />;
  }
  
  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Lexical 编辑器池 */}
      {lexicalTabs.map(tab => (
        <EditorWithFreeze
          key={tab.id}
          isActive={tab.id === activeTabId}
        >
          <LexicalEditorInstance
            nodeId={tab.nodeId || ''}
            tabId={tab.id}
            workspaceId={selectedWorkspaceId}
          />
        </EditorWithFreeze>
      ))}
      
      {/* Excalidraw 编辑器池 */}
      {excalidrawTabs.map(tab => (
        <EditorWithFreeze
          key={tab.id}
          isActive={tab.id === activeTabId}
        >
          <ExcalidrawEditorContainer nodeId={tab.nodeId || ''} />
        </EditorWithFreeze>
      ))}
      
      {/* Code 编辑器池 */}
      {codeTabs.map(tab => (
        <EditorWithFreeze
          key={tab.id}
          isActive={tab.id === activeTabId}
        >
          <CodeEditorContainer nodeId={tab.nodeId || ''} />
        </EditorWithFreeze>
      ))}
      
      {/* Diagram 编辑器池 */}
      {diagramTabs.map(tab => {
        const diagramType = getDiagramTypeByFilename(tab.title);
        if (!diagramType) return null;
        
        return (
          <EditorWithFreeze
            key={tab.id}
            isActive={tab.id === activeTabId}
          >
            <DiagramEditorContainer
              nodeId={tab.nodeId || ''}
              diagramType={diagramType}
            />
          </EditorWithFreeze>
        );
      })}
    </div>
  );
};
```

## 数据流设计

### Tab 切换流程

```
用户点击 Tab B
    │
    ▼
setActiveTab("tab-b")
    │
    ▼
所有 EditorWithFreeze 响应
    │
    ├─▶ Tab A: freeze={true}  (冻结渲染)
    │   └─▶ visibility: hidden, z-index: -1
    │
    ├─▶ Tab B: freeze={false} (恢复渲染) ✅
    │   └─▶ visibility: visible, z-index: 1
    │
    ├─▶ Tab C: freeze={true}  (保持冻结)
    └─▶ Tab D: freeze={true}  (保持冻结)
    
结果：
- Tab B 立即显示（< 16ms）
- 所有状态完整保留
- 无需重新加载数据
```

### 保存流程（不变）

```
编辑器内容变化
    │
    ▼
useUnifiedSave.updateContent(content)
    │
    ├─▶ 防抖 3 秒
    │
    ▼
UnifiedSaveService.saveContent()
    │
    ├─▶ 1. 更新 DB
    ├─▶ 2. 更新 Tab.isDirty
    ├─▶ 3. 更新 SaveStore
    └─▶ 4. 触发回调
```

## 关键改动点

### 1. 移除 MultiEditorContainer

```typescript
// ❌ 删除
packages/editor/src/components/MultiEditorContainer.tsx
packages/editor/src/components/EditorInstance.tsx

// ✅ 替代方案
apps/desktop/src/components/lexical-editor/lexical-editor-instance.container.fn.tsx
```

### 2. 移除 key={activeTab.id}

```typescript
// ❌ 之前：每次切换都销毁重建
<ExcalidrawEditorContainer
  key={activeTab.id}  // ← 移除
  nodeId={activeTab.nodeId}
/>

// ✅ 之后：使用 Freeze 保留状态
{excalidrawTabs.map(tab => (
  <EditorWithFreeze key={tab.id} isActive={tab.id === activeTabId}>
    <ExcalidrawEditorContainer nodeId={tab.nodeId} />
  </EditorWithFreeze>
))}
```

### 3. 所有编辑器同时渲染

```typescript
// ✅ 所有 tabs 的编辑器都渲染，用 Freeze 控制
{lexicalTabs.map(tab => ...)}      // 渲染所有 Lexical tabs
{excalidrawTabs.map(tab => ...)}   // 渲染所有 Excalidraw tabs
{codeTabs.map(tab => ...)}         // 渲染所有 Code tabs
{diagramTabs.map(tab => ...)}      // 渲染所有 Diagram tabs
```

## 文件清单

### 新增文件

```
apps/desktop/src/components/
├── editor-with-freeze/
│   ├── editor-with-freeze.view.fn.tsx
│   ├── editor-with-freeze.view.fn.test.tsx
│   ├── editor-with-freeze.types.ts
│   └── index.ts
│
└── lexical-editor/
    ├── lexical-editor-instance.container.fn.tsx
    ├── lexical-editor-instance.container.fn.test.tsx
    ├── lexical-editor-instance.types.ts
    └── index.ts
```

### 修改文件

```
apps/desktop/src/components/story-workspace/
└── story-workspace.container.fn.tsx  (重构)

apps/desktop/package.json  (添加 react-freeze 依赖)
```

### 删除文件

```
packages/editor/src/components/
├── MultiEditorContainer.tsx  (删除)
└── EditorInstance.tsx        (删除)
```

## 性能优化

### react-freeze 工作原理

1. **完全阻止 reconciliation**：冻结时 React 不会对该子树进行任何 diff 计算
2. **保留 DOM**：所有原生视图实例保留在内存中
3. **保留状态**：useState、useRef、Effects 全部保留
4. **0 计算开销**：冻结时完全跳过该子树

### 性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| Tab 切换耗时 | < 16ms | 一帧内完成 |
| 内存占用 | < 500MB (10 tabs) | 合理范围 |
| reconciliation | 0 次 | 冻结时完全阻止 |

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Lexical 状态管理变化 | 高 | 完善测试，确保状态保留 |
| useUnifiedSave 兼容性 | 中 | 保持 API 不变，只改渲染层 |
| 性能回归 | 中 | 性能测试，监控内存占用 |
| 边界情况 | 低 | 完善测试用例 |

## 测试策略

### 单元测试

- EditorWithFreeze 组件测试
- LexicalEditorInstance 组件测试
- 状态保留测试

### 集成测试

- Tab 切换测试
- 保存功能测试
- 多编辑器协同测试

### 性能测试

- Tab 切换耗时测试
- 内存占用测试
- reconciliation 次数测试

## 参考文档

- [react-freeze GitHub](https://github.com/software-mansion/react-freeze)
- `.kiro/steering/design-patterns.md` - 编辑器状态管理架构
