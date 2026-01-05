---
inclusion: manual
---

# 设计模式

## 文件操作队列模式

### 问题

文件创建/打开涉及多个异步步骤，没有队列控制会导致：
- 操作顺序不可预测
- 数据不一致

### 解决方案

```typescript
// lib/file-operation-queue.ts
import PQueue from 'p-queue';

export const fileOperationQueue = new PQueue({ concurrency: 1 });

// 使用
const handleClick = () => {
  openFile({ nodeId, workspaceId, title, type });
  // 队列内部处理所有异步操作
};
```

## 异步数据流：入口窄出口宽

### TaskEither 管道

```typescript
pipe(
  stepA,                          // TaskEither<E, A>
  TE.chain(a => stepB(a)),        // 只有成功才继续
  TE.chain(b => stepC(b)),
  TE.fold(
    error => handleError(error),   // Left 分支
    result => handleSuccess(result) // Right 分支
  )
)();
```

### 禁止的模式

```typescript
// ❌ async/await
const handleClick = async () => {
  try {
    const a = await stepA();
    const b = await stepB(a);
  } catch (e) { /* 不知道哪步失败 */ }
};

// ✅ TaskEither
pipe(stepA, TE.chain(stepB), TE.fold(onError, onSuccess))();
```

## 编辑器状态管理

使用 `react-freeze` 统一管理所有编辑器 tab 状态：

```typescript
import { Freeze } from 'react-freeze';

export const EditorWithFreeze = memo(({ isActive, children }) => (
  <Freeze freeze={!isActive}>
    <div style={{ visibility: isActive ? 'visible' : 'hidden' }}>
      {children}
    </div>
  </Freeze>
));

// 使用
{tabs.map(tab => (
  <EditorWithFreeze key={tab.id} isActive={tab.id === activeTabId}>
    <Editor nodeId={tab.nodeId} />
  </EditorWithFreeze>
))}
```

### 避免的反模式

```typescript
// ❌ key 导致销毁重建
<Editor key={activeTab.id} />

// ❌ 条件渲染导致卸载
{isActive && <Editor />}

// ✅ 使用 Freeze
<EditorWithFreeze isActive={isActive}><Editor /></EditorWithFreeze>
```

## 异步保存服务

```typescript
const saveService = createSaveService({
  nodeId,
  contentType: 'lexical',
  onSaved: () => toast.success('保存成功'),
  onError: (error) => toast.error(error.message),
});

// 内容变化时
saveService.updateContent(content);

// 手动保存
pipe(saveService.saveNow(), TE.fold(onError, onSuccess))();
```
