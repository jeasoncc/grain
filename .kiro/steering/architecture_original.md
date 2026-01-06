---
inclusion: manual
---
# Grain 函数式数据流架构

本文档定义 Grain 项目的核心架构设计，基于函数式编程理念，实现数据的单向流动。

## 设计哲学

```
对象 = 纯数据（Interface + Builder 构建）
操作 = 纯函数（对数据进行变换）
流动 = 管道（pipe 连接函数）
边界 = 入口窄，出口宽
```

- **数据是水流**：数据像水一样流经管道，每个管道节点是一个纯函数
- **对象无方法**：Interface 和 Builder 只定义数据结构，不包含行为
- **函数是管道**：所有操作都是纯函数，通过 pipe 组合
- **不可变性**：数据一旦创建就不可修改，更新产生新对象
- **入口窄出口宽**：严格校验输入（Zod/serde），宽松处理输出（容错、降级）

### 入口窄出口宽原则

```
┌─────────────────────────────────────────────────────────────────┐
│                        入口窄出口宽                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    外部数据                                                      │
│        │                                                        │
│        ▼                                                        │
│    ┌───────────────────────────────────────┐                   │
│    │           🚪 窄入口（严格校验）          │                   │
│    │                                       │                   │
│    │  - Zod Schema 严格校验                │                   │
│    │  - serde 反序列化 + 自定义校验         │                   │
│    │  - 拒绝不符合规范的数据                │                   │
│    │  - 早失败，快失败                      │                   │
│    │  - 明确的错误信息                      │                   │
│    └───────────────────────────────────────┘                   │
│                        │                                        │
│                        ▼                                        │
│    ┌───────────────────────────────────────┐                   │
│    │           🏭 纯函数处理核心             │                   │
│    │                                       │                   │
│    │  - 类型安全的数据流                    │                   │
│    │  - 不可变数据转换                      │                   │
│    │  - 可预测的行为                        │                   │
│    └───────────────────────────────────────┘                   │
│                        │                                        │
│                        ▼                                        │
│    ┌───────────────────────────────────────┐                   │
│    │           🚀 宽出口（容错输出）          │                   │
│    │                                       │                   │
│    │  - 优雅降级（缺失字段用默认值）         │                   │
│    │  - 兼容多种客户端版本                  │                   │
│    │  - 可选字段灵活处理                    │                   │
│    │  - 向后兼容的响应格式                  │                   │
│    └───────────────────────────────────────┘                   │
│                        │                                        │
│                        ▼                                        │
│    外部消费者                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**入口窄（Strict Input）**：
- 所有外部输入必须经过严格校验
- 不符合规范的数据立即拒绝，返回明确错误
- 使用 Zod（前端）和 serde + 自定义校验（后端）
- 遵循"早失败"原则，在边界处拦截非法数据

**出口宽（Tolerant Output）**：
- 输出时对缺失数据提供合理默认值
- 响应格式保持向后兼容
- 可选字段使用 `Option<T>` / `T | undefined`
- 允许客户端忽略不认识的字段

## 数据流架构图（同步）

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Grain 函数式数据流架构（同步）                            │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────┐
                                    │     外部世界     │
                                    └────────┬────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               │                             │                             │
               ▼                             ▼                             ▼
      ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
      │    UI 表单       │          │    API 响应     │          │   文件导入      │
      └────────┬────────┘          └────────┬────────┘          └────────┬────────┘
               │                             │                             │
               └─────────────────────────────┼─────────────────────────────┘
                                             │
                                             ▼
                          ┌─────────────────────────────────────┐
                          │           Zod Schema                │
                          │          (运行时校验)                │
                          └──────────────────┬──────────────────┘
                                             │
                               ┌─────────────┴─────────────┐
                               │                           │
                          ❌ 校验失败                   ✅ 校验通过
                               │                           │
                               ▼                           ▼
                    ┌─────────────────┐         ┌─────────────────────────┐
                    │    错误处理      │         │       Builder           │
                    └─────────────────┘         │   → Object.freeze()     │
                                                └────────────┬────────────┘
                                                             │
                                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                           Pure Function Pipeline (纯函数管道)                        │
│                                                                                    │
│    ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐             │
│    │  fn_1    │─────▶│  fn_2    │─────▶│  fn_3    │─────▶│  fn_n    │             │
│    │ (解析)   │ pipe │ (转换)   │ pipe │ (计算)   │ pipe │ (格式化) │             │
│    └──────────┘      └──────────┘      └──────────┘      └──────────┘             │
└────────────────────────────────────────────────────────────────────────────────────┘
                                                             │
                    ┌────────────────────────────────────────┼────────────────────────┐
                    │                                        │                        │
                    ▼                                        ▼                        ▼
     ┌─────────────────────────┐          ┌─────────────────────────┐    ┌───────────────────┐
     │     DB Functions        │          │    Store Functions      │    │ Export Functions  │
     │      (持久化)            │          │     (状态)              │    │    (导出)         │
     └────────────┬────────────┘          └────────────┬────────────┘    └───────────────────┘
                  │                                    │
                  ▼                                    ▼
     ┌─────────────────────────┐          ┌─────────────────────────┐
     │       IndexedDB         │◀────────▶│     Zustand Store       │
     │        (Dexie)          │  persist │      (内存状态)          │
     └─────────────────────────┘          └────────────┬────────────┘
                                                       │
                                                       ▼
                              ┌─────────────────────────────────────────────────────┐
                              │                   React Hooks (响应式绑定)            │
                              └──────────────────────────┬──────────────────────────┘
                                                         │
                                                         ▼
                              ┌─────────────────────────────────────────────────────┐
                              │                   Components (UI 组件)               │
                              └──────────────────────────┬──────────────────────────┘
                                                         │
                                                         └──────────────▶ 回到顶部
```

---

## 前端异步数据流架构图

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         Grain 前端异步数据流架构                                      │
│                      （使用 fp-ts TaskEither 处理异步操作）                           │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────┐
                                    │   用户操作触发   │
                                    │  (点击/输入等)   │
                                    └────────┬────────┘
                                             │
                                             ▼
                          ┌─────────────────────────────────────┐
                          │           Action 层                 │
                          │      (actions/*.action.ts)          │
                          └──────────────────┬──────────────────┘
                                             │
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                    TaskEither Pipeline (异步纯函数管道)                              │
│                                                                                    │
│    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│    │   TE.Do      │───▶│  TE.bind    │───▶│  TE.chain   │───▶│   TE.map    │   │
│    │  (开始管道)   │    │ (绑定变量)   │    │ (链式调用)   │    │  (转换结果)  │   │
│    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                                                    │
│    特点：                                                                          │
│    - TaskEither<AppError, T> 封装异步操作                                          │
│    - Left = 错误，Right = 成功                                                     │
│    - 错误自动传递，无需 try-catch                                                   │
│    - 惰性求值，调用时才执行                                                         │
└────────────────────────────────────────────────────────────────────────────────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               │                             │                             │
               ▼                             ▼                             ▼
      ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
      │  Rust Backend   │          │   Local Store   │          │   File System   │
      │  (Tauri/Warp)   │          │   (Zustand)     │          │   (导出/导入)    │
      └────────┬────────┘          └────────┬────────┘          └────────┬────────┘
               │                             │                             │
               │ invoke/fetch                │ setState                    │ writeFile
               │ (异步 IO)                   │ (同步)                      │ (异步 IO)
               ▼                             ▼                             ▼
      ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
      │    SQLite       │          │  Memory State   │          │   Local Files   │
      │  (持久化存储)    │          │   (运行时状态)   │          │   (文件系统)    │
      └────────┬────────┘          └────────┬────────┘          └─────────────────┘
               │                             │
               └─────────────────────────────┘
                                             │
                                             ▼
                          ┌─────────────────────────────────────┐
                          │         执行 TaskEither             │
                          │    pipe(task, TE.fold(...))()       │
                          └──────────────────┬──────────────────┘
                                             │
                               ┌─────────────┴─────────────┐
                               │                           │
                          ❌ Left (错误)              ✅ Right (成功)
                               │                           │
                               ▼                           ▼
                    ┌─────────────────┐         ┌─────────────────────────┐
                    │   错误处理       │         │    更新 UI 状态         │
                    │  - Toast 提示   │         │  - Store 更新           │
                    │  - 日志记录     │         │  - 触发重渲染           │
                    └─────────────────┘         └────────────┬────────────┘
                                                             │
                                                             ▼
                              ┌─────────────────────────────────────────────────────┐
                              │                   React Hooks (响应式绑定)            │
                              │                                                     │
                              │  useQuery / useMutation / useStore                  │
                              └──────────────────────────┬──────────────────────────┘
                                                         │
                                                         ▼
                              ┌─────────────────────────────────────────────────────┐
                              │                   Components (UI 组件)               │
                              │                                                     │
                              │  - Loading 状态                                     │
                              │  - Error 状态                                       │
                              │  - Success 状态                                     │
                              └─────────────────────────────────────────────────────┘
```

### 异步 Action 示例

```typescript
// actions/node/create-node.action.ts
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { AppError } from "@/lib/error.types";

// 异步 Action 返回 TaskEither
export const createNode = (
  params: CreateNodeParams
): TE.TaskEither<AppError, Node> =>
  pipe(
    // 1. 校验输入（同步纯函数）
    TE.fromEither(validateNodeParams(params)),
    
    // 2. 转换为请求对象（同步纯函数）
    TE.map(validated => toCreateNodeRequest(validated)),
    
    // 3. 调用 Rust 后端（异步 IO）
    TE.chain(request => 
      TE.tryCatch(
        () => invoke<Node>("create_node", { request }),
        (error) => AppError.fromUnknown(error)
      )
    ),
    
    // 4. 更新本地状态（副作用）
    TE.tap(node => 
      TE.fromIO(() => useNodeStore.getState().addNode(node))
    ),
    
    // 5. 记录日志（副作用）
    TE.tap(node => 
      TE.fromIO(() => logger.success(`[Node] 创建成功: ${node.id}`))
    )
  );

// 在组件中使用
const handleCreate = async () => {
  const result = await pipe(
    createNode({ title: "新节点", workspaceId }),
    TE.fold(
      (error) => T.of(showErrorToast(error.message)),
      (node) => T.of(showSuccessToast(`创建成功: ${node.title}`))
    )
  )();
};
```

### 异步数据流类型签名

```typescript
// 同步纯函数：Input → Output
type SyncPureFn<A, B> = (a: A) => B;

// 同步纯函数（可能失败）：Input → Either<Error, Output>
type SyncPureFnE<A, B> = (a: A) => E.Either<AppError, B>;

// 异步纯函数：Input → TaskEither<Error, Output>
type AsyncPureFn<A, B> = (a: A) => TE.TaskEither<AppError, B>;

// Action 签名（异步，有副作用边界）
type Action<Params, Result> = (params: Params) => TE.TaskEither<AppError, Result>;
```

### 前端异步流程对照表

| 同步流程 | 异步流程 | 说明 |
|---------|---------|------|
| `pipe(a, fn1, fn2)` | `pipe(a, TE.map(fn1), TE.chain(fn2))` | 函数组合 |
| `Either<E, A>` | `TaskEither<E, A>` | 错误容器 |
| `E.map` | `TE.map` | 转换成功值 |
| `E.chain` | `TE.chain` | 链式调用 |
| `E.fold` | `TE.fold` | 处理结果 |
| 立即执行 | `()` 调用执行 | 惰性求值 |

### 异步操作分类

| 操作类型 | 返回类型 | 示例 |
|---------|---------|------|
| 同步纯函数 | `A → B` | `validateParams`, `transformNode` |
| 同步可失败 | `A → Either<E, B>` | `parseJson`, `validateSchema` |
| 异步 IO | `A → TaskEither<E, B>` | `invoke`, `fetch`, `readFile` |
| 副作用 | `A → IO<void>` | `setState`, `logger.info` |

## 依赖关系图

```
                              types/
                         (Interface + Builder + Schema)
                                 │
                                 │ 被所有层依赖
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
    ┌────────┐              ┌────────┐              ┌────────┐
    │  lib/  │              │  db/   │              │ stores/│
    │  (FP)  │              │(持久化) │              │ (状态) │
    └────────┘              └────────┘              └────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                                 ▼
                          ┌────────────┐
                          │    fn/     │
                          │  (纯函数)   │
                          └────────────┘
                                 │
                                 ▼
                          ┌────────────┐
                          │  actions/  │
                          │ (业务操作)  │
                          └────────────┘
                                 │
                                 ▼
                          ┌────────────┐
                          │   hooks/   │
                          │ (React绑定) │
                          └────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
             ┌────────────┐            ┌────────────┐
             │components/ │            │  routes/   │
             │   (UI)     │            │  (路由)    │
             └────────────┘            └────────────┘
```

### 依赖规则

| 层级 | 可依赖 | 说明 |
|------|--------|------|
| `types/` | 无 | 最底层，纯数据定义 |
| `lib/` | `types/` | 函数式工具 |
| `db/` | `types/` | 持久化操作 |
| `stores/` | `types/` | 运行时状态 |
| `fn/` | `types/`, `lib/`, `db/`, `stores/` | 纯函数管道 |
| `actions/` | `fn/`, `db/`, `stores/`, `types/` | 业务操作 |
| `hooks/` | `actions/`, `fn/`, `stores/` | React 绑定 |
| `components/` | `hooks/`, `types/` | UI 组件 |
| `routes/` | `hooks/`, `components/` | 仅编排，不实现逻辑 |

## 数据三层守卫

| 层级 | 职责 | 时机 |
|------|------|------|
| **Zod Schema** | 运行时校验外部数据 | 数据入口 |
| **Interface** | 编译时类型检查 | 开发时 |
| **Builder** | 构建约束 + 不可变 | 对象创建 |

## 角色对照表

| 概念 | 角色 | 特点 |
|-----|------|-----|
| **Interface** | 水的形状 | 定义数据长什么样 |
| **Builder** | 造水的模具 | 构建符合形状的数据 |
| **Zod Schema** | 守门员 | 运行时校验数据有效性 |
| **Function** | 管道 | 纯净、无副作用、可组合 |
| **Pipe** | 管道连接器 | 让数据流动起来 |
| **Store** | 水池 | 暂存运行时状态 |
| **DB** | 水库 | 持久化存储 |
| **Hook** | 水龙头 | 连接数据和 UI |
| **Component** | 喷泉 | 数据的最终展现 |


---

## Rust 后端统一架构

### 设计哲学

```
核心逻辑 = 纯函数（rust-core）
边界适配 = 宏生成（零手写）
两端合一 = 单一真相源
```

- **纯函数核心**：所有业务逻辑在 `rust-core` 中以纯函数形式定义
- **边界是噪音**：HTTP/IPC 只是数据的入口和出口，不应包含逻辑
- **宏消除重复**：通过声明式宏自动生成 Warp handlers 和 Tauri commands
- **一次修改，两端生效**：修改 `rust-core` 自动影响 Web API 和桌面应用

### Rust 后端数据流

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           Rust 后端统一架构                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │    前端请求      │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
           ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
           │  Web Browser  │  │ Tauri Desktop │  │  Mobile App   │
           │   (fetch)     │  │   (invoke)    │  │   (fetch)     │
           └───────┬───────┘  └───────┬───────┘  └───────┬───────┘
                   │                  │                  │
                   ▼                  ▼                  │
           ┌───────────────┐  ┌───────────────┐         │
           │  Warp Server  │  │ Tauri Runtime │         │
           │  (HTTP 边界)   │  │  (IPC 边界)   │         │
           └───────┬───────┘  └───────┬───────┘         │
                   │                  │                  │
                   │    ┌─────────────┴─────────────┐    │
                   │    │                           │    │
                   ▼    ▼                           ▼    ▼
           ┌─────────────────────────────────────────────────────┐
           │                                                     │
           │              🦀 rust-core (纯函数核心)                │
           │                                                     │
           │  ┌─────────────────────────────────────────────┐   │
           │  │              api/ (API 端点定义)              │   │
           │  │                                             │   │
           │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐     │   │
           │  │  │Workspace│  │  Node   │  │ Content │     │   │
           │  │  │Endpoints│  │Endpoints│  │Endpoints│     │   │
           │  │  └────┬────┘  └────┬────┘  └────┬────┘     │   │
           │  │       │            │            │           │   │
           │  └───────┼────────────┼────────────┼───────────┘   │
           │          │            │            │               │
           │          ▼            ▼            ▼               │
           │  ┌─────────────────────────────────────────────┐   │
           │  │              fn/ (纯函数管道)                 │   │
           │  │                                             │   │
           │  │  Input ──▶ validate ──▶ transform ──▶ Output │   │
           │  │                                             │   │
           │  └─────────────────────┬───────────────────────┘   │
           │                        │                           │
           │                        ▼                           │
           │  ┌─────────────────────────────────────────────┐   │
           │  │              db/ (数据库操作)                 │   │
           │  │                                             │   │
           │  │  ┌────────┐  ┌────────┐  ┌────────┐        │   │
           │  │  │ create │  │  read  │  │ update │        │   │
           │  │  └────────┘  └────────┘  └────────┘        │   │
           │  │                                             │   │
           │  └─────────────────────┬───────────────────────┘   │
           │                        │                           │
           └────────────────────────┼───────────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │     SQLite      │
                          │   (持久化存储)   │
                          └─────────────────┘
```

### API 端点定义模式

```rust
// rust-core/src/api/mod.rs

/// API 端点 trait - 所有端点的统一抽象
pub trait ApiEndpoint: Send + Sync {
    /// 输入类型（请求参数）
    type Input: DeserializeOwned + Send;
    /// 输出类型（响应数据）
    type Output: Serialize + Send;
    
    /// 执行端点逻辑 - 纯函数，只依赖 db 和 input
    fn execute(
        db: &DatabaseConnection,
        input: Self::Input,
    ) -> impl Future<Output = AppResult<Self::Output>> + Send;
}

// 具体端点实现
pub struct GetWorkspaces;
impl ApiEndpoint for GetWorkspaces {
    type Input = ();
    type Output = Vec<WorkspaceResponse>;
    
    async fn execute(db: &DatabaseConnection, _: ()) -> AppResult<Self::Output> {
        workspace_db_fn::find_all(db).await
    }
}
```

### 宏生成边界代码

```rust
// rust-core/src/macros.rs

/// 生成 Warp handlers
#[macro_export]
macro_rules! warp_routes {
    ($db:expr, $($endpoint:ty => $method:ident $path:literal),* $(,)?) => {{
        use warp::Filter;
        let db = std::sync::Arc::new($db);
        
        $(
            let route = warp::path!($path)
                .and(warp::$method())
                .and(with_db(db.clone()))
                .and_then(|db| async move {
                    <$endpoint>::execute(&db, ()).await
                        .map(|r| warp::reply::json(&r))
                        .map_err(|e| warp::reject::custom(e))
                });
        )*
        
        // 组合所有路由
        routes
    }};
}

/// 生成 Tauri commands
#[macro_export]
macro_rules! tauri_commands {
    ($($endpoint:ty => $name:ident),* $(,)?) => {
        $(
            #[tauri::command]
            pub async fn $name(
                db: tauri::State<'_, DatabaseConnection>,
                input: <$endpoint as ApiEndpoint>::Input,
            ) -> Result<<$endpoint as ApiEndpoint>::Output, String> {
                <$endpoint>::execute(&db, input)
                    .await
                    .map_err(|e| e.to_string())
            }
        )*
    };
}
```

### 最终使用方式

```rust
// apps/api-rust/src/main.rs - Warp 服务器
#[tokio::main]
async fn main() {
    let db = rust_core::db::connect().await.unwrap();
    
    let routes = rust_core::warp_routes!(db,
        GetWorkspaces => get "api/workspaces",
        GetWorkspace => get "api/workspaces/{id}",
        CreateWorkspace => post "api/workspaces",
        // ... 其他端点
    );
    
    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;
}

// apps/desktop/src-tauri/src/lib.rs - Tauri 应用
rust_core::tauri_commands!(
    GetWorkspaces => get_workspaces,
    GetWorkspace => get_workspace,
    CreateWorkspace => create_workspace,
    // ... 其他端点
);

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_workspaces,
            get_workspace,
            create_workspace,
        ])
        .run(tauri::generate_context!())
        .unwrap();
}
```

### 层级职责

| 层级 | 位置 | 职责 |
|------|------|------|
| **api/** | `rust-core/src/api/` | API 端点定义，实现 `ApiEndpoint` trait |
| **fn/** | `rust-core/src/fn/` | 纯函数管道，业务逻辑转换 |
| **db/** | `rust-core/src/db/` | 数据库 CRUD 操作 |
| **types/** | `rust-core/src/types/` | 类型定义（Request/Response/Entity） |
| **macros/** | `rust-core/src/macros.rs` | 宏定义，生成边界代码 |

### 事务支持

```rust
// 需要事务的端点
pub struct CreateNodeWithContent;
impl ApiEndpoint for CreateNodeWithContent {
    type Input = CreateNodeRequest;
    type Output = NodeResponse;
    
    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        // 开启事务
        let txn = db.begin().await?;
        
        // 1. 创建节点
        let node = node_db_fn::create(&txn, &input).await?;
        
        // 2. 创建内容（如果需要）
        if let Some(content) = input.initial_content {
            content_db_fn::create(&txn, &node.id, &content).await?;
        }
        
        // 3. 提交事务
        txn.commit().await?;
        
        Ok(node.into())
    }
}
```

### 角色对照表（Rust 后端）

| 概念 | 角色 | 特点 |
|-----|------|-----|
| **ApiEndpoint** | 水闸 | 定义数据如何进出系统 |
| **Input/Output** | 水的形状 | 请求和响应的类型约束 |
| **execute()** | 水处理厂 | 纯函数，处理数据流 |
| **db/** | 水库 | 持久化存储 |
| **fn/** | 管道 | 数据转换和验证 |
| **宏** | 分流器 | 将水流导向不同出口（HTTP/IPC） |
| **Warp/Tauri** | 出水口 | 边界适配，不含逻辑 |

---

## Rust 异步数据流详解

### 设计哲学（与前端对应）

```
对象 = 纯数据（Struct + Builder 构建，不可变）
操作 = 纯函数（*_fn.rs 文件，接收对象返回新对象）
流动 = 异步管道（async/await + Result 链式调用）
```

- **数据是水流**：数据像水一样流经异步管道，每个节点是一个纯函数
- **对象无方法**：Struct 只定义数据结构，只有 `new()` 或 Builder 构建方法
- **函数是管道**：所有操作都是纯函数，通过 `?` 和 `map` 组合
- **不可变性**：数据一旦创建就不可修改，更新产生新对象

### Rust 异步数据流架构图

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           Rust 异步数据流架构                                        │
│                        （与前端 TypeScript 数据流对应）                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────┐
                                    │     外部世界     │
                                    └────────┬────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               │                             │                             │
               ▼                             ▼                             ▼
      ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
      │  HTTP Request   │          │  Tauri Invoke   │          │   File Import   │
      │   (Warp JSON)   │          │   (IPC JSON)    │          │   (文件系统)     │
      └────────┬────────┘          └────────┬────────┘          └────────┬────────┘
               │                             │                             │
               └─────────────────────────────┼─────────────────────────────┘
                                             │
                                             ▼
                          ┌─────────────────────────────────────┐
                          │         serde Deserialize           │
                          │          (运行时反序列化)             │
                          └──────────────────┬──────────────────┘
                                             │
                               ┌─────────────┴─────────────┐
                               │                           │
                          ❌ 解析失败                   ✅ 解析成功
                               │                           │
                               ▼                           ▼
                    ┌─────────────────┐         ┌─────────────────────────┐
                    │   AppError      │         │    Request Struct       │
                    │  (错误类型)      │         │   (不可变请求对象)        │
                    └─────────────────┘         └────────────┬────────────┘
                                                             │
                                                             ▼
                          ┌─────────────────────────────────────┐
                          │         validate_fn.rs              │
                          │          (校验纯函数)                │
                          └──────────────────┬──────────────────┘
                                             │
                               ┌─────────────┴─────────────┐
                               │                           │
                          ❌ 校验失败                   ✅ 校验通过
                               │                           │
                               ▼                           ▼
                    ┌─────────────────┐         ┌─────────────────────────┐
                    │   AppError      │         │   Validated Input       │
                    │ (ValidationErr) │         │   (已校验的输入)         │
                    └─────────────────┘         └────────────┬────────────┘
                                                             │
                                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                      Pure Function Pipeline (纯函数管道 - fn/)                       │
│                                                                                    │
│    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│    │ parse_fn.rs  │───▶│transform_fn.rs│───▶│  tree_fn.rs  │───▶│ format_fn.rs │   │
│    │   (解析)     │ ?  │   (转换)      │ ?  │  (树操作)    │ ?  │  (格式化)    │   │
│    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                                                    │
│    特点：                                                                          │
│    - 所有函数都是 async fn，返回 Result<T, AppError>                               │
│    - 使用 ? 操作符链式传递错误                                                      │
│    - 每个函数接收不可变引用，返回新对象                                              │
│    - 文件名以 _fn.rs 结尾标识纯函数                                                 │
└────────────────────────────────────────────────────────────────────────────────────┘
                                                             │
                    ┌────────────────────────────────────────┼────────────────────────┐
                    │                                        │                        │
                    ▼                                        ▼                        ▼
     ┌─────────────────────────┐          ┌─────────────────────────┐    ┌───────────────────┐
     │     db/*_db_fn.rs       │          │    Response Builder     │    │ Export Functions  │
     │      (数据库操作)        │          │     (响应构建)          │    │    (导出)         │
     │                         │          │                         │    │                   │
     │  - create()             │          │  - into_response()      │    │  - to_json()      │
     │  - find_by_id()         │          │  - with_metadata()      │    │  - to_markdown()  │
     │  - update()             │          │                         │    │                   │
     │  - delete()             │          │                         │    │                   │
     └────────────┬────────────┘          └────────────┬────────────┘    └───────────────────┘
                  │                                    │
                  ▼                                    │
     ┌─────────────────────────┐                       │
     │        SQLite           │                       │
     │    (SeaORM 异步操作)     │                       │
     │                         │                       │
     │  ~/.local/share/grain/  │                       │
     │       grain.db          │                       │
     └─────────────────────────┘                       │
                                                       │
                                                       ▼
                          ┌─────────────────────────────────────┐
                          │         serde Serialize             │
                          │          (序列化为 JSON)             │
                          └──────────────────┬──────────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
           ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
           │  HTTP Response│        │ Tauri Response│        │  File Output  │
           │  (Warp JSON)  │        │  (IPC JSON)   │        │   (文件系统)   │
           └───────────────┘        └───────────────┘        └───────────────┘
                    │                        │                        │
                    └────────────────────────┼────────────────────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │     前端接收     │
                                    └─────────────────┘
```

### Rust 依赖关系图

```
                              types/
                    (Struct + Builder + Request/Response)
                                 │
                                 │ 被所有层依赖
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
    ┌────────┐              ┌────────┐              ┌────────┐
    │ error  │              │  db/   │              │ macros/│
    │(AppErr)│              │(持久化) │              │ (宏)   │
    └────────┘              └────────┘              └────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                                 ▼
                          ┌────────────┐
                          │    fn/     │
                          │ (*_fn.rs)  │
                          │  (纯函数)   │
                          └────────────┘
                                 │
                                 ▼
                          ┌────────────┐
                          │   api/     │
                          │(ApiEndpoint│
                          │   trait)   │
                          └────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
             ┌────────────┐            ┌────────────┐
             │ Warp Server│            │   Tauri    │
             │ (api-rust) │            │ (desktop)  │
             └────────────┘            └────────────┘
```

### Rust 依赖规则

| 层级 | 可依赖 | 说明 |
|------|--------|------|
| `types/` | 无 | 最底层，纯数据定义 |
| `types/error.rs` | `types/` | 错误类型定义 |
| `db/` | `types/` | 数据库操作（副作用边界） |
| `fn/` | `types/` | 纯函数管道（无副作用） |
| `api/` | `types/`, `fn/`, `db/` | API 端点定义 |
| `macros/` | `api/` | 宏生成边界代码 |
| `Warp/Tauri` | `macros/`, `api/` | 边界适配器 |

### 数据三层守卫（Rust 版）

| 层级 | 职责 | 时机 | 对应前端 |
|------|------|------|---------|
| **serde** | 运行时反序列化 | 数据入口 | Zod Schema |
| **Struct** | 编译时类型检查 | 开发时 | Interface |
| **Builder** | 构建约束 + 不可变 | 对象创建 | Builder |

### 前后端数据流对照

| 前端 (TypeScript) | 后端 (Rust) | 说明 |
|------------------|-------------|------|
| `Zod Schema` | `serde Deserialize` | 运行时数据校验 |
| `Interface` | `Struct` | 编译时类型定义 |
| `Builder` | `Builder` / `new()` | 对象构建 |
| `*.fn.ts` | `*_fn.rs` | 纯函数文件 |
| `pipe()` | `?` + `map()` | 函数组合 |
| `TaskEither` | `Result<T, AppError>` | 错误处理 |
| `IndexedDB` | `SQLite` | 持久化存储 |
| `Zustand Store` | (无对应) | 前端状态管理 |
| `React Hooks` | (无对应) | 前端响应式绑定 |

### 异步函数签名规范

```rust
// 纯函数签名（fn/*_fn.rs）
// 特点：无副作用，只依赖输入参数
pub fn validate_node(input: &CreateNodeRequest) -> Result<ValidatedNode, AppError> {
    // 纯计算，无 IO
}

pub fn transform_node(node: &Node, update: &UpdateNodeRequest) -> Node {
    // 返回新对象，不修改原对象
    Node {
        id: node.id.clone(),
        title: update.title.clone().unwrap_or_else(|| node.title.clone()),
        // ...
    }
}

// 数据库函数签名（db/*_db_fn.rs）
// 特点：有副作用（IO），async
pub async fn create_node(
    db: &DatabaseConnection,
    input: &CreateNodeRequest,
) -> Result<Node, AppError> {
    // 数据库操作
}

pub async fn find_by_id(
    db: &DatabaseConnection,
    id: &str,
) -> Result<Option<Node>, AppError> {
    // 数据库查询
}

// API 端点签名（api/*.rs）
// 特点：组合纯函数和数据库函数
impl ApiEndpoint for CreateNode {
    type Input = CreateNodeRequest;
    type Output = NodeResponse;
    
    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        // 1. 校验（纯函数）
        let validated = validate_fn::validate_node(&input)?;
        
        // 2. 转换（纯函数）
        let node_data = transform_fn::to_node_entity(&validated);
        
        // 3. 持久化（副作用）
        let node = node_db_fn::create(db, &node_data).await?;
        
        // 4. 构建响应（纯函数）
        Ok(NodeResponse::from(node))
    }
}
```

### 角色对照表（前后端统一）

| 概念 | 前端角色 | 后端角色 | 特点 |
|-----|---------|---------|-----|
| **数据形状** | Interface | Struct | 定义数据长什么样 |
| **构建器** | Builder | Builder/new() | 构建符合形状的数据 |
| **守门员** | Zod Schema | serde | 运行时校验数据有效性 |
| **管道** | Function (*.fn.ts) | Function (*_fn.rs) | 纯净、无副作用、可组合 |
| **连接器** | pipe() | ? + map() | 让数据流动起来 |
| **水库** | IndexedDB | SQLite | 持久化存储 |
| **错误容器** | TaskEither | Result<T, E> | 错误传递 |
| **边界** | API Client | Warp/Tauri | 数据入口和出口 |

---

## 端到端数据流架构图

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           Grain 端到端数据流架构                                      │
│                        （从用户操作到数据返回的完整路径）                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    前端 (TypeScript)                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     │
│    │  Component  │────▶│   Action    │────▶│    Repo     │────▶│ API Client  │     │
│    │  (UI 组件)  │     │ (业务操作)   │     │ (数据仓库)   │     │ (边界适配)   │     │
│    └─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘     │
│           ▲                                                           │            │
│           │                                                           │            │
│           │            ┌─────────────────────────────────────────────┐│            │
│           │            │         TaskEither Pipeline                 ││            │
│           │            │                                             ││            │
│           │            │  TE.Do → TE.bind → TE.chain → TE.map       ││            │
│           │            │                                             ││            │
│           │            └─────────────────────────────────────────────┘│            │
│           │                                                           │            │
│    ┌──────┴──────┐     ┌─────────────┐     ┌─────────────┐           │            │
│    │   Store     │◀────│  TE.fold    │◀────│  Response   │◀──────────┘            │
│    │ (Zustand)   │     │ (结果处理)   │     │  (JSON)     │                        │
│    └─────────────┘     └─────────────┘     └─────────────┘                        │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                             │
                                             │ invoke() / fetch()
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    边界层 (Boundary)                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│         ┌───────────────────────┐              ┌───────────────────────┐           │
│         │    Tauri Runtime      │              │     Warp Server       │           │
│         │    (IPC 边界)         │              │    (HTTP 边界)        │           │
│         │                       │              │                       │           │
│         │  #[tauri::command]    │              │  warp::path!()        │           │
│         └───────────┬───────────┘              └───────────┬───────────┘           │
│                     │                                      │                        │
│                     └──────────────────┬───────────────────┘                        │
│                                        │                                            │
│                                        ▼                                            │
│                          ┌─────────────────────────┐                               │
│                          │    serde Deserialize    │                               │
│                          │    (JSON → Struct)      │                               │
│                          └─────────────────────────┘                               │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    后端 (Rust)                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│    ┌─────────────────────────────────────────────────────────────────────────┐     │
│    │                        rust-core (纯函数核心)                            │     │
│    │                                                                         │     │
│    │    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐             │     │
│    │    │    api/     │────▶│    fn/      │────▶│    db/      │             │     │
│    │    │ (端点定义)   │     │ (*_fn.rs)   │     │ (*_db_fn.rs)│             │     │
│    │    └─────────────┘     └─────────────┘     └──────┬──────┘             │     │
│    │                                                    │                    │     │
│    │    ┌─────────────────────────────────────────────┐│                    │     │
│    │    │         Result Pipeline                     ││                    │     │
│    │    │                                             ││                    │     │
│    │    │  validate? → transform? → persist? → map   ││                    │     │
│    │    │                                             ││                    │     │
│    │    └─────────────────────────────────────────────┘│                    │     │
│    │                                                    │                    │     │
│    └────────────────────────────────────────────────────┼────────────────────┘     │
│                                                         │                          │
│                                                         ▼                          │
│                                            ┌─────────────────────────┐             │
│                                            │        SQLite           │             │
│                                            │  ~/.local/share/grain/  │             │
│                                            │       grain.db          │             │
│                                            └─────────────────────────┘             │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                             │
                                             │ Result<T, AppError>
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    响应流程 (Response)                               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│    ┌─────────────────────────────────────────────────────────────────────────┐     │
│    │                                                                         │     │
│    │    Result<T, AppError>                                                  │     │
│    │           │                                                             │     │
│    │           ├─── Ok(data) ───▶ serde Serialize ───▶ JSON Response        │     │
│    │           │                                                             │     │
│    │           └─── Err(e) ────▶ AppError::to_json() ───▶ Error Response    │     │
│    │                                                                         │     │
│    └─────────────────────────────────────────────────────────────────────────┘     │
│                                                                                     │
│    响应格式：                                                                        │
│    ┌─────────────────────────────┐    ┌─────────────────────────────┐             │
│    │ 成功响应                     │    │ 错误响应                     │             │
│    │ {                           │    │ {                           │             │
│    │   "data": { ... },          │    │   "error": {                │             │
│    │   "success": true           │    │     "code": "NOT_FOUND",    │             │
│    │ }                           │    │     "message": "节点不存在"  │             │
│    │                             │    │   },                        │             │
│    │                             │    │   "success": false          │             │
│    │                             │    │ }                           │             │
│    └─────────────────────────────┘    └─────────────────────────────┘             │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 端到端数据流时序

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   User   │    │Component │    │  Action  │    │   Repo   │    │  Rust    │    │  SQLite  │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │               │               │
     │  点击按钮     │               │               │               │               │
     │──────────────▶│               │               │               │               │
     │               │               │               │               │               │
     │               │ createNode()  │               │               │               │
     │               │──────────────▶│               │               │               │
     │               │               │               │               │               │
     │               │               │ TE.chain      │               │               │
     │               │               │──────────────▶│               │               │
     │               │               │               │               │               │
     │               │               │               │ invoke()      │               │
     │               │               │               │──────────────▶│               │
     │               │               │               │               │               │
     │               │               │               │               │ INSERT        │
     │               │               │               │               │──────────────▶│
     │               │               │               │               │               │
     │               │               │               │               │◀──────────────│
     │               │               │               │               │   Ok(node)    │
     │               │               │               │◀──────────────│               │
     │               │               │               │   JSON        │               │
     │               │               │◀──────────────│               │               │
     │               │               │   Right(node) │               │               │
     │               │◀──────────────│               │               │               │
     │               │ TE.fold       │               │               │               │
     │               │ updateStore   │               │               │               │
     │◀──────────────│               │               │               │               │
     │  UI 更新      │               │               │               │               │
     │               │               │               │               │               │
```
