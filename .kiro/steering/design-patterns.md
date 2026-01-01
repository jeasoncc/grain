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


## 异步数据流哲学：入口窄出口宽

### 核心理念

传统的 `async/await` 和 `Promise` 模式存在根本性问题：

```typescript
// ❌ async/await：扁平化的假象，实际是「出口窄入口宽」
async function create() {
  const a = await stepA();  // 等待，阻塞
  const b = await stepB(a); // 等待，阻塞
  const c = await stepC(b); // 等待，阻塞
  return c;                 // 最后才知道结果
}
// 问题：
// 1. 错误处理靠 try-catch 包裹，丑陋且容易遗漏
// 2. 顺序执行的假象，实际上每一步都在「等待」
// 3. 类型系统无法强制正确的时序
```

**正确的异步数据流应该是「入口窄出口宽」：**

```
入口窄：一个未执行的函数（状态机）
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│                    管道内部（柯里化组合）                      │
│                                                             │
│   stepA ──chain──▶ stepB ──chain──▶ stepC                  │
│     │                │                │                     │
│     ▼                ▼                ▼                     │
│   Left/Right      Left/Right      Left/Right               │
│   (失败/成功)      (失败/成功)      (失败/成功)               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
  │                                                         │
  ▼                                                         ▼
出口宽：两个明确的分支
  ├── Left (错误) ──▶ 错误处理函数
  └── Right (成功) ──▶ 成功处理函数
```

### TaskEither：函数即状态机

`TaskEither<E, A>` 的本质是：
- **Task**：一个未执行的异步函数 `() => Promise<...>`
- **Either**：执行后的两种状态 `Left<E>` 或 `Right<A>`

```typescript
// TaskEither 是一个「未执行的状态机」
type TaskEither<E, A> = () => Promise<Either<E, A>>

// 它不会立即执行，只有调用 () 时才运行
const task: TaskEither<Error, User> = () => fetchUser();

// 组合多个状态机，形成管道
const pipeline = pipe(
  fetchUser,                    // () => Promise<Either<E, User>>
  TE.chain(user =>              // User => TaskEither<E, Profile>
    fetchProfile(user.id)
  ),
  TE.chain(profile =>           // Profile => TaskEither<E, Settings>
    fetchSettings(profile.id)
  ),
);

// 最后执行，两个出口
pipe(
  pipeline,
  TE.fold(
    error => handleError(error),   // Left 分支
    result => handleSuccess(result) // Right 分支
  )
)();  // ← 只在这里执行
```

### chain：管道的口在上一个管道里面

`chain` 的关键在于：**只有前一步成功，才会执行下一步**

```typescript
// chain 的类型签名
// chain: (f: (a: A) => TaskEither<E, B>) => (ma: TaskEither<E, A>) => TaskEither<E, B>

// 视觉化：管道嵌套
pipe(
  stepA,                          // TaskEither<E, A>
  TE.chain(a =>                   // 只有 stepA 成功，才进入这里
    pipe(
      stepB(a),                   // TaskEither<E, B>
      TE.chain(b =>               // 只有 stepB 成功，才进入这里
        stepC(b)                  // TaskEither<E, C>
      )
    )
  )
)

// 等价于扁平写法
pipe(
  stepA,
  TE.chain(a => stepB(a)),
  TE.chain(b => stepC(b)),
)
```

### IO：同步副作用的函子

对于同步副作用（toast、setState、console.log），使用 `IO`：

```typescript
// IO<A> = () => A
// 一个未执行的同步函数

const showToast = (msg: string): IO.IO<void> => 
  () => toast.success(msg);

const setState = (value: string): IO.IO<void> =>
  () => setSelectedNodeId(value);

// 在 TaskEither 管道中使用 IO
pipe(
  createFile(params),
  TE.chainFirstIOK(result =>      // 执行 IO 副作用，保留原值
    showToast("File created")
  ),
  TE.chainFirstIOK(result =>
    setState(result.node.id)
  ),
)
```

### 项目中的应用

```typescript
// ✅ 正确：使用 TaskEither + chain
const handleCreateTemplate = (creator: TemplateCreator) => {
  pipe(
    // 1. 创建文件（返回 TaskEither）
    creator({ workspaceId, templateParams: { date: new Date() } }),
    
    // 2. 成功后，打开文件
    TE.chain(result => 
      pipe(
        openFile({ ...result.node }),
        TE.map(() => result)  // 保留 result
      )
    ),
    
    // 3. 成功后，执行 UI 副作用
    TE.chainFirstIOK(result => () => {
      setSelectedNodeId(result.node.id);
      setExpandedFolders(calculatePath(result.node.id));
    }),
    
    // 4. 两个出口：成功或失败
    TE.fold(
      error => TE.fromIO(() => toast.error("Failed")),
      result => TE.fromIO(() => toast.success("Created"))
    )
  )();  // ← 只在这里执行
};
```

### 类型对照表

| 类型 | 同步/异步 | 有无错误 | 用途 |
|------|----------|---------|------|
| `IO<A>` | 同步 | 无 | 同步副作用（toast, setState） |
| `IOEither<E, A>` | 同步 | 有 | 同步副作用 + 可能失败 |
| `Task<A>` | 异步 | 无 | 异步操作（永不失败） |
| `TaskEither<E, A>` | 异步 | 有 | 异步操作 + 可能失败（DB, API） |

### 禁止的模式

```typescript
// ❌ 禁止：async/await 顺序执行
const handleClick = async () => {
  try {
    const a = await stepA();
    const b = await stepB(a);
    toast.success("Done");
  } catch (e) {
    toast.error("Failed");
  }
};

// ❌ 禁止：Promise.then 链
stepA()
  .then(a => stepB(a))
  .then(b => stepC(b))
  .then(() => toast.success("Done"))
  .catch(() => toast.error("Failed"));

// ✅ 正确：TaskEither + chain + fold
pipe(
  stepA,
  TE.chain(a => stepB(a)),
  TE.chain(b => stepC(b)),
  TE.fold(
    () => TE.fromIO(() => toast.error("Failed")),
    () => TE.fromIO(() => toast.success("Done"))
  )
)();
```
