# Design Document

## Overview

本设计文档描述编辑器标签页数据流重构的技术实现方案。核心目标是建立单一数据源架构，通过文件操作队列确保操作的有序执行，解决当前双数据源冲突和竞态条件问题。

### 设计原则

1. **单一数据源**：IndexedDB 是唯一的持久化数据源
2. **纯内存状态**：Zustand Store 只作为运行时缓存，不持久化
3. **队列串行执行**：所有文件操作通过 p-queue 串行执行
4. **数据先于渲染**：内容加载完成后才创建 Tab 和渲染 Editor

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              重构后的数据流架构                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

【UI 层 - 统一入口】
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  ActivityBar     │     │   FileTree       │     │  CommandPalette  │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                                  ▼
【队列层 - 串行执行】
                    ┌─────────────────────────┐
                    │   fileOperationQueue    │
                    │   (lib/file-operation-  │
                    │    queue.ts)            │
                    │   concurrency: 1        │
                    └────────────┬────────────┘
                                 │
【Action 层 - 业务逻辑】
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
         ┌─────────────────┐       ┌─────────────────┐
         │ createFile()    │       │ openFile()      │
         │ actions/file/   │       │ actions/file/   │
         └────────┬────────┘       └────────┬────────┘
                  │                         │
【DB 层 - 持久化】
                  ▼                         ▼
         ┌─────────────────┐       ┌─────────────────┐
         │ 1. addContent() │       │ 1. getContent() │
         │ 2. addNode()    │       │    from DB      │
         └────────┬────────┘       └────────┬────────┘
                  │                         │
                  └────────────┬────────────┘
                               │
【Store 层 - 内存状态】
                               ▼
                    ┌─────────────────────────┐
                    │   Editor_Tabs_Store     │
                    │   - tabs: []            │
                    │   - activeTabId: null   │
                    │   - editorStates: {}    │
                    │   (无 persist 中间件)    │
                    └────────────┬────────────┘
                                 │
【渲染层 - UI 组件】
                                 ▼
                    ┌─────────────────────────┐
                    │   MultiEditorContainer  │
                    │   → EditorInstance      │
                    └─────────────────────────┘
```

## Components and Interfaces

### 1. File Operation Queue (lib/file-operation-queue.ts)

```typescript
import PQueue from 'p-queue';

/**
 * 文件操作队列 - 模块级单例
 * 
 * 所有文件的创建和打开操作都通过此队列串行执行，
 * 避免竞态条件和数据不一致。
 */
export const fileOperationQueue = new PQueue({
  concurrency: 1,  // 串行执行
  autoStart: true,
});

/**
 * 队列状态类型
 */
export interface QueueStatus {
  readonly size: number;      // 等待中的任务数
  readonly pending: number;   // 正在执行的任务数
  readonly isPaused: boolean; // 是否暂停
}

/**
 * 获取队列状态
 */
export const getQueueStatus = (): QueueStatus => ({
  size: fileOperationQueue.size,
  pending: fileOperationQueue.pending,
  isPaused: fileOperationQueue.isPaused,
});
```

### 2. Open File Action (actions/file/open-file.action.ts)

```typescript
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { getContentByNodeId } from '@/db';
import { fileOperationQueue } from '@/lib/file-operation-queue';
import type { AppError } from '@/lib/error.types';
import { useEditorTabsStore } from '@/stores/editor-tabs.store';
import type { TabType } from '@/types/editor-tab';

/**
 * 打开文件参数
 */
export interface OpenFileParams {
  readonly workspaceId: string;
  readonly nodeId: string;
  readonly title: string;
  readonly type: TabType;
}

/**
 * 打开文件结果
 */
export interface OpenFileResult {
  readonly tabId: string;
  readonly isNewTab: boolean;
  readonly hasContent: boolean;
}

/**
 * 打开文件 Action
 * 
 * 通过队列串行执行，确保：
 * 1. 先从 DB 加载内容
 * 2. 再更新 Store（创建 tab + 设置 editorState）
 * 3. 最后 UI 渲染
 */
export const openFile = (params: OpenFileParams): Promise<OpenFileResult> => {
  return fileOperationQueue.add(async () => {
    const { openTab, updateEditorState, tabs } = useEditorTabsStore.getState();
    
    // 检查是否已打开
    const existingTab = tabs.find(t => t.nodeId === params.nodeId);
    if (existingTab) {
      useEditorTabsStore.getState().setActiveTab(existingTab.id);
      return {
        tabId: existingTab.id,
        isNewTab: false,
        hasContent: true,
      };
    }
    
    // 从 DB 加载内容
    const contentResult = await getContentByNodeId(params.nodeId)();
    
    // 创建 tab
    openTab({
      workspaceId: params.workspaceId,
      nodeId: params.nodeId,
      title: params.title,
      type: params.type,
    });
    
    // 获取新创建的 tab ID
    const newTab = useEditorTabsStore.getState().tabs.find(
      t => t.nodeId === params.nodeId
    );
    const tabId = newTab?.id ?? params.nodeId;
    
    // 设置编辑器内容
    let hasContent = false;
    if (E.isRight(contentResult) && contentResult.right) {
      try {
        const parsed = JSON.parse(contentResult.right.content);
        updateEditorState(tabId, { serializedState: parsed });
        hasContent = true;
      } catch {
        // JSON 解析失败，使用空内容
      }
    }
    
    return {
      tabId,
      isNewTab: true,
      hasContent,
    };
  });
};
```

### 3. Create File Action (actions/file/create-file.action.ts)

```typescript
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import { addContent, addNode, getNextOrder } from '@/db';
import { fileOperationQueue } from '@/lib/file-operation-queue';
import type { AppError } from '@/lib/error.types';
import { useEditorTabsStore } from '@/stores/editor-tabs.store';
import type { NodeInterface, NodeType } from '@/types/node';
import type { TabType } from '@/types/editor-tab';

/**
 * 创建文件参数
 */
export interface CreateFileParams {
  readonly workspaceId: string;
  readonly parentId: string | null;
  readonly title: string;
  readonly type: NodeType;
  readonly content?: string;
  readonly tags?: string[];
}

/**
 * 创建文件结果
 */
export interface CreateFileResult {
  readonly node: NodeInterface;
  readonly tabId: string;
}

/**
 * 创建文件 Action
 * 
 * 通过队列串行执行，确保：
 * 1. 先创建 Content（如果不是文件夹）
 * 2. 再创建 Node
 * 3. 最后更新 Store
 */
export const createFile = (params: CreateFileParams): Promise<CreateFileResult> => {
  return fileOperationQueue.add(async () => {
    const { workspaceId, parentId, title, type, content = '', tags } = params;
    
    // 1. 获取排序号
    const orderResult = await getNextOrder(parentId, workspaceId)();
    const order = E.isRight(orderResult) ? orderResult.right : 0;
    
    // 2. 创建节点
    const nodeResult = await addNode(workspaceId, title, {
      parent: parentId,
      type,
      order,
      collapsed: true,
      tags,
    })();
    
    if (E.isLeft(nodeResult)) {
      throw new Error(nodeResult.left.message);
    }
    
    const node = nodeResult.right;
    
    // 3. 创建内容（非文件夹）
    if (type !== 'folder') {
      await addContent(node.id, content)();
    }
    
    // 4. 更新 Store（非文件夹）
    if (type !== 'folder') {
      const { openTab, updateEditorState } = useEditorTabsStore.getState();
      
      openTab({
        workspaceId,
        nodeId: node.id,
        title,
        type: type as TabType,
      });
      
      // 设置初始内容
      if (content) {
        try {
          const parsed = JSON.parse(content);
          updateEditorState(node.id, { serializedState: parsed });
        } catch {
          // 非 JSON 内容，跳过
        }
      }
    }
    
    // 获取 tab ID
    const newTab = useEditorTabsStore.getState().tabs.find(
      t => t.nodeId === node.id
    );
    
    return {
      node,
      tabId: newTab?.id ?? node.id,
    };
  });
};
```

### 4. Editor Tabs Store (stores/editor-tabs.store.ts)

```typescript
/**
 * Editor Tabs Store - 重构版
 * 
 * 关键变更：
 * 1. 移除 persist 中间件
 * 2. 初始状态为空
 * 3. 只存储纯数据
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
// 注意：不使用 persist 中间件

export const useEditorTabsStore = create<EditorTabsStore>()(
  immer((set, get) => ({
    // 初始状态 - 空
    tabs: [],
    activeTabId: null,
    editorStates: {},
    
    // ... actions 保持不变
  }))
);
```

## Data Models

### EditorTab

```typescript
interface EditorTab {
  readonly id: string;
  readonly workspaceId: string;
  readonly nodeId: string;
  readonly title: string;
  readonly type: TabType;
  readonly isDirty?: boolean;
}
```

### EditorInstanceState

```typescript
interface EditorInstanceState {
  readonly serializedState?: SerializedEditorState;
  readonly scrollTop?: number;
  readonly selectionState?: EditorSelectionState;
  readonly lastModified?: number;
}
```

### OpenFileParams / CreateFileParams

见上方 Components and Interfaces 部分。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Open File Operation Order

*For any* file open operation, the system SHALL first load content from IndexedDB, then update the Editor_Tabs_Store with both tab and editorState.

**Validates: Requirements 1.3, 3.1, 3.2, 5.2, 8.2, 8.3**

### Property 2: Create File Operation Order

*For any* file create operation, the system SHALL first create content in Content_DB, then create node in Node_DB, then update Editor_Tabs_Store.

**Validates: Requirements 7.2, 7.3, 7.4**

### Property 3: Queue Serial Execution

*For any* sequence of file operations (open or create), all operations SHALL be executed through the fileOperationQueue with concurrency 1, ensuring serial execution.

**Validates: Requirements 2.2, 2.3, 2.4, 5.1, 7.5, 8.4**

### Property 4: Skip Reload for Existing Tab

*For any* file that is already open in a tab, calling openFile SHALL only switch to that tab without reloading content from the database.

**Validates: Requirements 5.5, 8.6**

### Property 5: Cleanup on Tab Close

*For any* tab close operation, the system SHALL remove both the tab from tabs array and the corresponding entry from editorStates.

**Validates: Requirements 4.2, 4.3**

### Property 6: Queue Promise Resolution

*For any* operation enqueued to fileOperationQueue, the returned Promise SHALL resolve when the operation completes successfully, or reject if the operation fails.

**Validates: Requirements 2.6**

### Property 7: No Render Before Content Load

*For any* newly opened file, the EditorInstance SHALL NOT be rendered until the content has been loaded from the database and stored in editorStates.

**Validates: Requirements 3.4**

### Property 8: Template Creators Use Create File Action

*For any* template file creator (Diary, Wiki, Ledger, etc.), calling the creator SHALL internally use the createFile action through the queue.

**Validates: Requirements 9.5**

## Error Handling

### Queue Error Handling

```typescript
// 队列操作失败时的处理
try {
  const result = await openFile(params);
} catch (error) {
  // 1. 记录错误日志
  logger.error('[FileOperation] 打开文件失败:', error);
  
  // 2. 显示用户友好的错误提示
  toast.error('Failed to open file');
  
  // 3. 队列继续处理下一个任务（不会阻塞）
}
```

### DB Error Handling

```typescript
// DB 操作失败时的处理
const contentResult = await getContentByNodeId(nodeId)();

if (E.isLeft(contentResult)) {
  // 1. 记录错误
  logger.warn('[FileOperation] 内容加载失败:', contentResult.left);
  
  // 2. 继续创建 tab，但使用空内容
  openTab({ ... });
  // 不设置 editorState，让编辑器使用默认空状态
}
```

### Store Update Error Handling

Store 更新是同步操作，不会失败。但需要确保在 DB 操作成功后才更新 Store。

## Testing Strategy

### Unit Tests

1. **fileOperationQueue 配置测试**
   - 验证 concurrency 为 1
   - 验证队列是自动启动的

2. **openFile action 测试**
   - 测试正常打开文件流程
   - 测试已打开文件的切换
   - 测试 DB 加载失败的处理

3. **createFile action 测试**
   - 测试正常创建文件流程
   - 测试创建文件夹（不创建 content）
   - 测试 DB 操作失败的处理

4. **Editor_Tabs_Store 测试**
   - 验证初始状态为空
   - 验证不使用 persist 中间件

### Property-Based Tests

使用 fast-check 进行属性测试，每个属性测试至少运行 100 次迭代。

1. **Property 1 测试**：生成随机的 nodeId，验证 openFile 总是先调用 getContentByNodeId

2. **Property 2 测试**：生成随机的创建参数，验证 createFile 的操作顺序

3. **Property 3 测试**：生成随机的操作序列，验证所有操作都通过队列

4. **Property 4 测试**：生成随机的 nodeId，先打开再重复打开，验证不重复加载

5. **Property 5 测试**：生成随机的 tabs，关闭后验证清理

6. **Property 6 测试**：生成随机操作，验证 Promise 正确 resolve/reject

7. **Property 7 测试**：验证 editorStates 在 openFile 完成前不包含新 tab 的状态

8. **Property 8 测试**：调用各种模板创建器，验证都通过 createFile
