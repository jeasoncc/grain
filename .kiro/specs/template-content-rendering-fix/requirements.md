# Requirements Document

## Introduction

修复新建文件（特别是日记）时模板内容不显示的问题。

### 问题描述

用户创建新日记时，模板内容（如日期标题、默认段落）没有渲染到 Lexical 编辑器中，编辑器显示为空白。

### 根本原因

`openTabFlow` 原先分三步执行：
1. `addTab` - 添加标签
2. `setActiveTabId` - 设置活动标签
3. `setEditorState` - 设置编辑器状态

这导致 React 触发多次渲染。在第一次渲染时，`tabs` 已有新标签但 `editorStates` 还没有对应的状态。

`LexicalComposer` 只在**首次挂载**时读取 `initialConfig.editorState`，之后不会再读取。因此编辑器以空内容初始化，永远不会显示模板内容。

### 解决方案

添加 `addTabWithState` 原子操作，在单个 `set()` 调用中同时更新 `tabs`、`editorStates` 和 `activeTabId`，确保 React 只触发一次渲染，且渲染时状态完整。

## Glossary

- **Atomic_Operation**: 原子操作，在单个 Zustand `set()` 调用中更新多个状态字段
- **LexicalComposer**: Lexical 编辑器的根组件，只在首次挂载时读取 `initialConfig.editorState`
- **EditorInstanceState**: 编辑器实例状态，包含序列化的编辑器内容

## Requirements

### Requirement 1: 原子操作添加标签

**User Story:** As a user, I want template content to display immediately when I create a new file, so that I can start editing with the template.

#### Acceptance Criteria

1. WHEN a new file is created, THE System SHALL use `addTabWithState` atomic operation
2. THE `addTabWithState` operation SHALL update `tabs`, `editorStates`, and `activeTabId` in a single `set()` call
3. WHEN the editor mounts, THE `editorStates` SHALL already contain the initial content
4. THE LexicalComposer SHALL receive the correct `initialConfig.editorState` on first mount

### Requirement 2: 模板内容传递

**User Story:** As a developer, I want template content to flow correctly through the data pipeline, so that the editor receives it before mounting.

#### Acceptance Criteria

1. WHEN `createFile` is called with `content`, THE System SHALL parse it and pass to `openTabFlow`
2. THE `openTabFlow` SHALL accept `initialContent` parameter
3. THE `openTabFlow` SHALL create `EditorInstanceState` with the initial content
4. THE `addTabWithState` SHALL store the `EditorInstanceState` before React renders

## Implementation Summary

### 修改的文件

1. `apps/desktop/src/state/editor-tabs.state.ts`
   - 添加 `addTabWithState` 原子操作

2. `apps/desktop/src/flows/editor-tabs/editor-tabs.flow.ts`
   - 修改 `openTabFlow` 使用 `addTabWithState` 替代三个独立调用

### 关键代码

```typescript
// editor-tabs.state.ts
addTabWithState: (tab, editorState) => {
  set((state) => {
    state.tabs.push(tab as EditorTab);
    state.editorStates[tab.id] = editorState;
    state.activeTabId = tab.id;
  });
},

// editor-tabs.flow.ts
export const openTabFlow = (payload, store) => {
  // ... 检查已存在的 tab ...
  
  const newTab = EditorTabBuilder.create()/* ... */.build();
  const newEditorState = payload.initialContent
    ? EditorStateBuilder.fromDefault().serializedState(payload.initialContent).build()
    : EditorStateBuilder.fromDefault().build();

  // 使用原子操作
  store.addTabWithState(newTab, newEditorState);
};
```

## Technical Insights

1. **Lexical 初始化特性**: `LexicalComposer` 只在首次挂载时读取 `initialConfig.editorState`，之后的更新不会影响编辑器内容。

2. **Zustand 原子操作**: 当多个状态更新需要在同一次 React 渲染中可见时，必须使用单个 `set()` 调用。

3. **时序问题**: 分离的状态更新会导致中间状态，可能触发组件以不完整的数据渲染。
