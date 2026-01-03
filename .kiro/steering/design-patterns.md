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

### 什么是「入口窄出口宽」？

这是一个关于**控制流设计**的核心理念，用水流来比喻：

```
传统 async/await：入口宽出口窄（漏斗形）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ┌─────────────────────────────────────────────────────────────────────────┐
    │                           入口：宽（多种可能）                            │
    │                                                                         │
    │   async function create() {                                             │
    │     const a = await stepA();  ← 可能成功，可能失败，可能超时             │
    │     const b = await stepB(a); ← 可能成功，可能失败，可能超时             │
    │     const c = await stepC(b); ← 可能成功，可能失败，可能超时             │
    │     return c;                                                           │
    │   }                                                                     │
    │                                                                         │
    │   问题：每一步都有多种可能，但代码假装只有成功路径                         │
    │                                                                         │
    └─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                              ┌─────────────────┐
                              │  出口：窄（单一）│
                              │                 │
                              │  try {          │
                              │    result       │ ← 只有一个出口
                              │  } catch (e) {  │ ← 错误被「吞掉」
                              │    ???          │ ← 不知道哪一步失败
                              │  }              │
                              │                 │
                              └─────────────────┘

    问题：
    1. 错误信息丢失 - catch 只知道「有错误」，不知道「哪一步」
    2. 类型不安全 - TypeScript 无法追踪错误类型
    3. 控制流隐藏 - 看起来是顺序执行，实际每步都可能中断


TaskEither：入口窄出口宽（喇叭形）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                              ┌─────────────────┐
                              │  入口：窄（单一）│
                              │                 │
                              │  一个未执行的   │
                              │  TaskEither     │ ← 只是一个「计划」
                              │  （状态机）     │ ← 还没有执行
                              │                 │
                              └────────┬────────┘
                                       │
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                         管道内部（组合）                                  │
    │                                                                         │
    │   pipe(                                                                 │
    │     stepA,                    ← TaskEither<E, A>                        │
    │     TE.chain(a => stepB(a)),  ← 只有成功才继续                           │
    │     TE.chain(b => stepC(b)),  ← 只有成功才继续                           │
    │   )                                                                     │
    │                                                                         │
    │   特点：                                                                 │
    │   - 每一步都明确返回 Left（失败）或 Right（成功）                         │
    │   - 任何一步 Left，整个管道短路，直接到出口                               │
    │   - 类型系统追踪每一步的错误类型                                          │
    │                                                                         │
    └─────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                           出口：宽（两个分支）                            │
    │                                                                         │
    │   TE.fold(                                                              │
    │     error => handleError(error),   ← Left 分支：明确的错误处理           │
    │     result => handleSuccess(result) ← Right 分支：明确的成功处理         │
    │   )                                                                     │
    │                                                                         │
    │   优势：                                                                 │
    │   1. 错误类型明确 - 知道是哪种错误（ValidationError, DBError, etc.）     │
    │   2. 类型安全 - TypeScript 强制处理两种情况                              │
    │   3. 控制流显式 - 代码结构反映实际执行路径                                │
    │                                                                         │
    └─────────────────────────────────────────────────────────────────────────┘
```

### 为什么叫「入口窄出口宽」？

| 概念 | 入口 | 出口 | 比喻 |
|------|------|------|------|
| **async/await** | 宽（多种隐藏可能） | 窄（try-catch 吞掉细节） | 漏斗：信息丢失 |
| **TaskEither** | 窄（一个未执行的计划） | 宽（两个明确分支） | 喇叭：信息保留 |

**入口窄**：
- 只有一个 `TaskEither` 对象
- 它是一个「计划」，还没有执行
- 类型签名明确：`TaskEither<AppError, Result>`

**出口宽**：
- 两个明确的分支：`Left`（错误）和 `Right`（成功）
- 每个分支都有完整的类型信息
- 调用方必须处理两种情况（编译器强制）

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

```
TaskEither 的生命周期
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

阶段 1：定义（未执行）
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   const task: TaskEither<Error, User> = () => fetchUser();                     │
│                                                                                 │
│   此时：                                                                        │
│   - task 只是一个函数引用                                                       │
│   - 没有发起任何网络请求                                                        │
│   - 没有任何副作用                                                              │
│   - 可以安全地传递、组合、存储                                                   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ 组合多个 TaskEither
                                        ▼
阶段 2：组合（仍未执行）
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   const pipeline = pipe(                                                        │
│     fetchUser,                    // TaskEither<E, User>                        │
│     TE.chain(user =>              // User => TaskEither<E, Profile>             │
│       fetchProfile(user.id)                                                     │
│     ),                                                                          │
│     TE.chain(profile =>           // Profile => TaskEither<E, Settings>         │
│       fetchSettings(profile.id)                                                 │
│     ),                                                                          │
│   );                                                                            │
│                                                                                 │
│   此时：                                                                        │
│   - pipeline 仍然只是一个函数                                                   │
│   - 描述了「如果执行，应该怎么做」                                               │
│   - 仍然没有任何副作用                                                          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ 调用 ()
                                        ▼
阶段 3：执行（产生副作用）
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   pipe(                                                                         │
│     pipeline,                                                                   │
│     TE.fold(                                                                    │
│       error => handleError(error),   // Left 分支                               │
│       result => handleSuccess(result) // Right 分支                             │
│     )                                                                           │
│   )();  // ← 只在这里执行！                                                      │
│                                                                                 │
│   此时：                                                                        │
│   - 开始执行 fetchUser                                                          │
│   - 如果成功，执行 fetchProfile                                                 │
│   - 如果成功，执行 fetchSettings                                                │
│   - 最后进入 Left 或 Right 分支                                                 │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

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

```
chain 的工作原理
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TE.chain 的类型签名：
  chain: (f: (a: A) => TaskEither<E, B>) => (ma: TaskEither<E, A>) => TaskEither<E, B>

解读：
  - 输入：一个 TaskEither<E, A>（可能是 Left 或 Right）
  - 函数 f：只接收 A（成功值），返回新的 TaskEither<E, B>
  - 输出：一个新的 TaskEither<E, B>

关键：f 只在 Right 时被调用！

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   pipe(                                                                         │
│     stepA,                          // TaskEither<E, A>                         │
│     TE.chain(a => stepB(a)),        // 只有 stepA 成功，才执行 stepB            │
│     TE.chain(b => stepC(b)),        // 只有 stepB 成功，才执行 stepC            │
│   )                                                                             │
│                                                                                 │
│   执行流程：                                                                     │
│                                                                                 │
│   stepA 执行                                                                    │
│     │                                                                           │
│     ├── Left(error) ──────────────────────────────────────▶ 直接返回 Left       │
│     │                                                       （跳过 stepB, stepC）│
│     │                                                                           │
│     └── Right(a) ──▶ stepB(a) 执行                                              │
│                        │                                                        │
│                        ├── Left(error) ──────────────────▶ 直接返回 Left        │
│                        │                                   （跳过 stepC）        │
│                        │                                                        │
│                        └── Right(b) ──▶ stepC(b) 执行                           │
│                                           │                                     │
│                                           ├── Left(error) ──▶ 返回 Left         │
│                                           │                                     │
│                                           └── Right(c) ──────▶ 返回 Right(c)    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

这就是「短路」行为：任何一步 Left，后续步骤都不执行
```

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

### 完整对比：async/await vs TaskEither

```
场景：用户创建文件，需要 1) 校验 2) 保存到 DB 3) 更新 UI 4) 显示 toast
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ async/await 方式：
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   const handleCreate = async () => {                                            │
│     try {                                                                       │
│       const validated = validate(input);        // 可能抛异常                   │
│       const node = await saveToDb(validated);   // 可能抛异常                   │
│       updateStore(node);                        // 副作用                       │
│       toast.success("创建成功");                // 副作用                       │
│     } catch (e) {                                                               │
│       toast.error("创建失败");                  // 不知道哪一步失败              │
│       console.error(e);                         // 错误类型是 unknown           │
│     }                                                                           │
│   };                                                                            │
│                                                                                 │
│   问题：                                                                        │
│   1. 错误类型丢失 - catch 中 e 是 unknown                                       │
│   2. 不知道哪一步失败 - validate? saveToDb?                                     │
│   3. 副作用分散 - updateStore 和 toast 混在业务逻辑中                           │
│   4. 无法组合 - 这个函数无法被其他函数复用                                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

✅ TaskEither 方式：
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   const handleCreate = () => {                                                  │
│     pipe(                                                                       │
│       // 1. 校验（同步，可能失败）                                               │
│       TE.fromEither(validate(input)),                                           │
│                                                                                 │
│       // 2. 保存到 DB（异步，可能失败）                                          │
│       TE.chain(validated => saveToDb(validated)),                               │
│                                                                                 │
│       // 3. 更新 Store（IO 副作用，不影响管道）                                  │
│       TE.chainFirstIOK(node => () => updateStore(node)),                        │
│                                                                                 │
│       // 4. 两个出口                                                            │
│       TE.fold(                                                                  │
│         error => TE.fromIO(() => {                                              │
│           // 错误类型明确：ValidationError | DbError                            │
│           if (error.type === 'VALIDATION') {                                    │
│             toast.error(`校验失败: ${error.field}`);                            │
│           } else {                                                              │
│             toast.error(`保存失败: ${error.message}`);                          │
│           }                                                                     │
│         }),                                                                     │
│         node => TE.fromIO(() => toast.success("创建成功")),                     │
│       ),                                                                        │
│     )();                                                                        │
│   };                                                                            │
│                                                                                 │
│   优势：                                                                        │
│   1. 错误类型明确 - 知道是 ValidationError 还是 DbError                         │
│   2. 知道哪一步失败 - 错误携带上下文信息                                         │
│   3. 副作用集中 - chainFirstIOK 明确标记副作用                                  │
│   4. 可组合 - 整个管道可以被其他函数复用                                         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

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

---

**使用场景**：当发现代码重复或相似模式时，参考此文件进行抽象设计。


## 编辑器状态管理架构

### 核心原则

**所有编辑器使用统一的状态管理机制，避免多套架构并存。**

使用 `react-freeze` 统一管理所有编辑器（Lexical、Excalidraw、Code、Diagram）的 tab 状态，完全阻止非活动编辑器的 reconciliation，保留所有状态。

### 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                     统一编辑器池架构                             │
└─────────────────────────────────────────────────────────────────┘

StoryWorkspaceContainer
└── UnifiedEditorPool
    ├── 所有编辑器同时渲染
    ├── 使用 react-freeze 冻结非活动编辑器
    └── 使用 CSS 控制显示/隐藏
    
    ├── <Freeze freeze={!isActive}>
    │   ├── LexicalEditor (Tab A)
    │   ├── LexicalEditor (Tab B)
    │   ├── ExcalidrawEditor (Tab C)
    │   ├── CodeEditor (Tab D)
    │   └── DiagramEditor (Tab E)
    │
    └── 性能优势
        ├── 完全阻止 reconciliation（0 计算开销）
        ├── 保留所有状态（包括 Effects）
        ├── 切换瞬间完成（< 16ms）
        └── 架构统一，易于维护
```

### Tab 切换数据流

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
- 所有状态完整保留（滚动、光标、撤销历史、画布状态）
- 无需重新加载数据
```

### 核心组件

#### EditorWithFreeze（通用包装器）

```typescript
import { memo } from 'react';
import { Freeze } from 'react-freeze';

interface EditorWithFreezeProps {
  readonly isActive: boolean;
  readonly children: React.ReactNode;
}

export const EditorWithFreeze = memo(({ isActive, children }: EditorWithFreezeProps) => {
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
```

#### 使用方式

```typescript
// 所有编辑器统一使用方式
{lexicalTabs.map(tab => (
  <EditorWithFreeze key={tab.id} isActive={tab.id === activeTabId}>
    <LexicalEditorInstance nodeId={tab.nodeId} tabId={tab.id} />
  </EditorWithFreeze>
))}

{excalidrawTabs.map(tab => (
  <EditorWithFreeze key={tab.id} isActive={tab.id === activeTabId}>
    <ExcalidrawEditorContainer nodeId={tab.nodeId} />
  </EditorWithFreeze>
))}

{codeTabs.map(tab => (
  <EditorWithFreeze key={tab.id} isActive={tab.id === activeTabId}>
    <CodeEditorContainer nodeId={tab.nodeId} />
  </EditorWithFreeze>
))}

{diagramTabs.map(tab => (
  <EditorWithFreeze key={tab.id} isActive={tab.id === activeTabId}>
    <DiagramEditorContainer nodeId={tab.nodeId} diagramType={...} />
  </EditorWithFreeze>
))}
```

### 关键设计决策

| 决策 | 原因 |
|------|------|
| 使用 react-freeze 而非 React Activity | freeze 保留 Effects，Activity 销毁 Effects |
| 所有编辑器同时渲染 | 状态完整保留，切换无延迟 |
| 移除 MultiEditorContainer | 统一架构，避免两套机制 |
| 移除 key={activeTab.id} | 避免销毁重建，保留状态 |
| CSS absolute + z-index | 确保编辑器不重叠 |

### 状态保留清单

| 编辑器 | 保留的状态 |
|--------|-----------|
| Lexical | 光标位置、滚动位置、撤销历史、选中文本 |
| Excalidraw | 画布状态（缩放、平移、选中元素）、撤销历史 |
| Code (Monaco) | 光标位置、滚动位置、撤销历史、折叠状态 |
| Diagram | 渲染结果、滚动位置 |

### 与保存服务的兼容性

`react-freeze` 不销毁 Effects，因此与保存服务完全兼容：

```typescript
// 保存服务内部的 Effects 保留
useEffect(() => {
  // 注册 Ctrl+S 快捷键
  keyboardShortcutManager.registerShortcut(shortcutKey, performManualSave);
  
  return () => {
    // 清理快捷键
    keyboardShortcutManager.unregisterShortcut(shortcutKey);
  };
}, [registerShortcut, nodeId, performManualSave]);

// 冻结时：Effects 保留，快捷键仍然注册
// 解冻时：无需重新注册，立即可用
```

### 避免的反模式

```typescript
// ❌ 错误：使用 key 导致销毁重建
<ExcalidrawEditor key={activeTab.id} nodeId={activeTab.nodeId} />

// ❌ 错误：条件渲染导致卸载
{isActive && <ExcalidrawEditor nodeId={nodeId} />}

// ❌ 错误：多套管理机制
<MultiEditorContainer />  // Lexical 专用
<ExcalidrawEditor key={...} />  // 销毁重建

// ✅ 正确：统一使用 Freeze
{tabs.map(tab => (
  <EditorWithFreeze key={tab.id} isActive={tab.id === activeTabId}>
    <Editor nodeId={tab.nodeId} />
  </EditorWithFreeze>
))}
```

### 性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| Tab 切换耗时 | < 16ms | 一帧内完成 |
| 内存占用 | < 500MB (10 tabs) | 合理范围 |
| 状态保留率 | 100% | 所有状态完整保留 |
| reconciliation | 0 次 | 冻结时完全阻止 |

---

**使用场景**：实现编辑器 tab 管理、多实例状态保留时，参考此架构。


## 异步保存服务模式

### 问题背景

编辑器内容保存涉及多个异步步骤和状态管理：
1. 内容变化检测
2. 防抖控制（自动保存）
3. 数据库写入
4. UI 状态更新（isDirty、toast）

传统的 async/await 模式会导致：
- 副作用分散在各处
- 错误处理不一致
- 状态管理混乱
- 难以测试和组合

### 解决方案：TaskEither 保存管道

```
内容变化
    │
    ▼
updateContent(content)
    │
    ├── 更新 pendingContent
    ├── 更新 Tab isDirty (IO)
    └── 触发 debouncedSave
            │
            ▼ (防抖后)
┌───────────────────────────────────────────────────────────────────────────┐
│                        TaskEither 保存管道                                 │
│                                                                           │
│   saveContent(content)                                                    │
│        │                                                                  │
│        ▼                                                                  │
│   fromPredicate ──chain──▶ contentRepo.update ──chainFirstIOK──▶ 更新状态 │
│   (检查是否需要保存)           (数据库写入)           (内部状态 + Tab)      │
│        │                          │                      │                │
│   Left/Right               Left/Right              Left/Right            │
│        │                          │                      │                │
│        └──────────────────────────┼──────────────────────┘                │
│                                   │                                       │
│                          任何一步 Left                                     │
│                          整个管道短路                                       │
└───────────────────────────────────────────────────────────────────────────┘
        │
        ▼
    fold 分流
        │
        ├── Left ──▶ onError callback
        │
        └── Right ──▶ onSaved callback
```

### 核心实现

```typescript
// fn/save/save.service.fn.ts

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import { debounce } from 'es-toolkit';
import type { AppError } from '@/lib/error.types';

interface SaveConfig {
  readonly nodeId: string;
  readonly contentType: ContentType;
  readonly autoSaveDelay?: number;
  readonly tabId?: string;
  readonly setTabDirty?: (tabId: string, isDirty: boolean) => void;
  readonly onSaving?: () => void;
  readonly onSaved?: () => void;
  readonly onError?: (error: AppError) => void;
}

interface SaveResult {
  readonly success: boolean;
  readonly nodeId: string;
  readonly skipped?: boolean;
}

/**
 * 创建保存服务
 * 
 * 核心设计：
 * - saveContent 是 TaskEither 管道
 * - 所有副作用通过 chainFirstIOK 集中管理
 * - 防抖只是触发机制，不改变保存逻辑
 */
export const createSaveService = (config: SaveConfig) => {
  const {
    nodeId,
    contentType,
    autoSaveDelay = 3000,
    tabId,
    setTabDirty,
    onSaving,
    onSaved,
    onError,
  } = config;

  // 内部状态
  let lastSavedContent = "";
  let pendingContent: string | null = null;

  /**
   * 核心保存函数 - TaskEither 版本
   */
  const saveContent = (
    content: string
  ): TE.TaskEither<AppError, SaveResult> =>
    pipe(
      // 1. 检查是否需要保存
      TE.fromPredicate(
        () => content !== lastSavedContent,
        (): AppError => ({ type: 'SKIP', message: '内容未变化' })
      )(content),

      // 2. 通知开始保存（IO 副作用）
      TE.chainFirstIOK(() => () => {
        onSaving?.();
      }),

      // 3. 执行数据库保存
      TE.chain(() => 
        contentRepo.updateContentByNodeId(nodeId, content, contentType)
      ),

      // 4. 成功后更新内部状态（IO 副作用）
      TE.chainFirstIOK(() => () => {
        lastSavedContent = content;
        pendingContent = null;
      }),

      // 5. 成功后更新 Tab 状态（IO 副作用）
      TE.chainFirstIOK(() => () => {
        if (tabId && setTabDirty) {
          setTabDirty(tabId, false);
        }
      }),

      // 6. 成功后通知（IO 副作用）
      TE.chainFirstIOK(() => () => {
        onSaved?.();
      }),

      // 7. 返回保存结果
      TE.map(() => ({ success: true, nodeId })),

      // 8. 错误处理（不中断管道，转换为结果）
      TE.orElse(error => {
        if (error.type === 'SKIP') {
          return TE.right({ success: true, nodeId, skipped: true });
        }
        onError?.(error);
        return TE.left(error);
      }),
    );

  /**
   * 防抖保存
   */
  const debouncedSave = autoSaveDelay > 0
    ? debounce(
        (content: string) => {
          pipe(
            saveContent(content),
            TE.fold(
              error => TE.fromIO(() => logger.error('[Save] 自动保存失败', error)),
              () => TE.fromIO(() => logger.debug('[Save] 自动保存成功')),
            ),
          )();
        },
        autoSaveDelay
      )
    : null;

  return {
    /**
     * 更新内容（触发防抖自动保存）
     */
    updateContent: (content: string): void => {
      pendingContent = content;

      // 标记为脏
      if (tabId && setTabDirty && content !== lastSavedContent) {
        setTabDirty(tabId, true);
      }

      // 触发防抖保存
      debouncedSave?.(content);
    },

    /**
     * 立即保存 - 返回 TaskEither
     * 
     * 入口窄：返回 TaskEither
     * 出口宽：调用方使用 fold 处理
     */
    saveNow: (): TE.TaskEither<AppError, SaveResult> => {
      debouncedSave?.cancel();

      if (pendingContent === null) {
        return TE.right({ success: true, nodeId, skipped: true });
      }

      return saveContent(pendingContent);
    },

    /**
     * 设置初始内容（不触发保存）
     */
    setInitialContent: (content: string): void => {
      lastSavedContent = content;
    },

    /**
     * 清理资源
     */
    dispose: (): void => {
      debouncedSave?.cancel();
    },

    /**
     * 是否有未保存的更改
     */
    hasUnsavedChanges: (): boolean => {
      return pendingContent !== null && pendingContent !== lastSavedContent;
    },
  };
};
```

### 组件中使用

```typescript
// 在编辑器组件中
const saveService = useMemo(
  () => createSaveService({
    nodeId,
    contentType: 'lexical',
    tabId,
    setTabDirty: useEditorTabsStore.getState().setTabDirty,
    onSaving: () => setSaveStatus('saving'),
    onSaved: () => setSaveStatus('saved'),
    onError: (error) => toast.error(`保存失败: ${error.message}`),
  }),
  [nodeId, tabId]
);

// 内容变化时
const handleChange = (content: string) => {
  saveService.updateContent(content);
};

// 手动保存（Ctrl+S）
const handleManualSave = () => {
  pipe(
    saveService.saveNow(),
    TE.fold(
      error => TE.fromIO(() => toast.error(`保存失败: ${error.message}`)),
      result => TE.fromIO(() => {
        if (!result.skipped) {
          toast.success('保存成功');
        }
      }),
    ),
  )();
};

// 组件卸载时
useEffect(() => {
  return () => {
    // 先保存未保存的内容
    if (saveService.hasUnsavedChanges()) {
      saveService.saveNow()();
    }
    saveService.dispose();
  };
}, [saveService]);
```

### 与创建流程的对比

| 方面 | 创建流程 | 保存流程 |
|------|---------|---------|
| 触发方式 | 用户点击 | 内容变化 + 防抖 |
| 异步模式 | TaskEither ✅ | TaskEither ✅ |
| 错误处理 | fold 分流 ✅ | fold 分流 ✅ |
| 副作用 | chainFirstIOK ✅ | chainFirstIOK ✅ |
| 返回类型 | TaskEither | TaskEither |

### 禁止的模式

```typescript
// ❌ 禁止：async/await 保存
const saveContent = async (content: string) => {
  try {
    await updateContentByNodeId(nodeId, content)();
    setTabDirty(tabId, false);
    onSaved?.();
  } catch (e) {
    onError?.(e);
  }
};

// ❌ 禁止：手动解包 TaskEither
const result = await updateContentByNodeId(nodeId, content)();
if (E.isRight(result)) {
  // ...
} else {
  // ...
}

// ✅ 正确：TaskEither 管道
pipe(
  contentRepo.updateContentByNodeId(nodeId, content),
  TE.chainFirstIOK(() => () => setTabDirty(tabId, false)),
  TE.fold(onError, onSaved),
)();
```

---

**使用场景**：实现编辑器内容保存、自动保存、手动保存时，参考此模式。
