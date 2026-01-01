---
inclusion: manual
---

# 设计模式

本文档记录 Grain 项目中的关键设计模式和架构决策。

## 文件操作队列模式

### 问题背景

在编辑器应用中，文件的创建和打开操作涉及多个异步步骤：
1. 数据库操作（创建/读取 Node 和 Content）
2. Store 状态更新（tabs、editorStates）
3. UI 渲染（Editor 组件）

如果没有适当的控制，会出现以下问题：

**问题 1：双数据源冲突**
```
刷新页面后：
┌─────────────────────┐     ┌─────────────────────┐
│   localStorage      │     │    IndexedDB        │
│   (tabs 持久化)     │     │   (content)         │
└─────────┬───────────┘     └─────────┬───────────┘
          │                           │
          │    ┌──────────────────────┘
          │    │
          ▼    ▼
     ┌─────────────────┐
     │  Zustand Store  │  ← 两个数据源，谁优先？
     │  tabs: [...]    │     tabs 有，content 无
     │  editorStates:{}│     → 页面空白！
     └─────────────────┘
```

**问题 2：创建流程不统一**
```
ActivityBar:
  createDiaryCompatAsync() → openTab() → updateEditorState()
  
FileTree:
  createNode() → handleSelectNode() → getContentByNodeId() → openTab()
  
两个流程不一致，容易出错
```

**问题 3：没有队列控制**
```
用户快速点击：
  Click 1 ──────────────────────────────▶ DB 操作 1
  Click 2 ──────────────────▶ DB 操作 2
  Click 3 ──────▶ DB 操作 3
  
  结果：操作顺序不可预测，可能导致数据不一致
```

### 解决方案：单一数据源 + 操作队列

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              理想的文件创建/打开流程                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

【统一入口】
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  ActivityBar     │     │   FileTree       │     │  CommandPalette  │
│  创建按钮        │     │   点击文件       │     │   快捷命令       │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   File Operation Queue  │  ← 模块级单例 (lib/)
                    │   (p-queue, concurrency=1)
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
         ┌─────────────────┐       ┌─────────────────┐
         │ createFile()    │       │ openFile()      │
         │ (actions/)      │       │ (actions/)      │
         └────────┬────────┘       └────────┬────────┘
                  │                         │
                  ▼                         ▼
         ┌─────────────────┐       ┌─────────────────┐
         │ 1. addContent() │       │ 1. getContent() │
         │ 2. addNode()    │       │    from DB      │
         │ 3. 返回结果     │       │ 2. 返回结果     │
         └────────┬────────┘       └────────┬────────┘
                  │                         │
                  └────────────┬────────────┘
                               │
                               ▼
                    ┌─────────────────────────┐
                    │   更新 Store            │
                    │   - openTab()           │
                    │   - updateEditorState() │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Editor 渲染           │
                    │   (内容已准备好)         │
                    └─────────────────────────┘
```

### 核心原则

1. **单一数据源**：IndexedDB 是唯一的持久化数据源，Store 只是内存缓存
2. **Tabs 不持久化**：刷新页面后 tabs 清空，像 Vim/Emacs 一样
3. **队列串行执行**：所有文件操作通过队列，避免竞态条件
4. **数据先于渲染**：内容从 DB 加载完成后，才创建 Tab 和渲染 Editor

### 实现位置

```
lib/
  └── file-operation-queue.ts    ← 模块级单例队列

actions/
  ├── file/
  │   ├── open-file.action.ts    ← 打开文件（通过队列）
  │   └── create-file.action.ts  ← 创建文件（通过队列）
  └── templated/
      └── ...                    ← 模板文件创建（调用 create-file）

stores/
  └── editor-tabs.store.ts       ← 纯内存状态，无持久化
```

### 代码示例

```typescript
// lib/file-operation-queue.ts
import PQueue from 'p-queue';

// 模块级单例，不放在 store 里
export const fileOperationQueue = new PQueue({ 
  concurrency: 1  // 串行执行
});

// actions/file/open-file.action.ts
export const openFile = (params: OpenFileParams) => 
  fileOperationQueue.add(async () => {
    // 1. 从 DB 加载内容
    const content = await getContentByNodeId(params.nodeId)();
    
    // 2. 内容加载完成后，更新 store
    const { openTab, updateEditorState } = useEditorTabsStore.getState();
    
    openTab({
      workspaceId: params.workspaceId,
      nodeId: params.nodeId,
      title: params.title,
      type: params.type,
    });
    
    if (E.isRight(content) && content.right) {
      const parsed = JSON.parse(content.right.content);
      updateEditorState(params.nodeId, { serializedState: parsed });
    }
  });
```

### 禁止的模式

```typescript
// ❌ 禁止：在组件中直接调用多个异步操作
const handleClick = async () => {
  openTab({ ... });  // store 更新
  const content = await getContentByNodeId(nodeId)();  // DB 操作
  updateEditorState(nodeId, { ... });  // store 更新
  // 问题：如果用户快速点击，操作顺序不可控
};

// ❌ 禁止：tabs 持久化到 localStorage
const useEditorTabsStore = create(
  persist(  // ← 不要使用 persist
    (set) => ({ ... }),
    { name: 'editor-tabs' }
  )
);

// ✅ 正确：通过队列统一处理
const handleClick = () => {
  openFile({ nodeId, workspaceId, title, type });
  // 队列内部处理所有异步操作
};
```
