# 需求文档：IndexedDB (Dexie) 到 SQLite 迁移

## 简介

将 Grain 桌面应用的数据持久化层从 IndexedDB (Dexie) 完全迁移到 SQLite (Rust 后端)。同时将数据查询层从 `dexie-react-hooks` 迁移到 `TanStack Query`。

## 术语表

- **Dexie**: 基于 IndexedDB 的 TypeScript ORM 库，当前用于前端数据持久化
- **useLiveQuery**: Dexie 提供的 React Hook，自动订阅数据库变化实现实时更新
- **TanStack_Query**: React 数据获取和缓存库，提供 useQuery/useMutation 等 hooks
- **Tauri_Command**: Tauri 框架中前端调用后端 Rust 函数的机制
- **TaskEither**: fp-ts 中的异步错误处理类型，用于函数式错误处理
- **Query_Key**: TanStack Query 中用于标识和缓存查询的唯一键
- **Invalidation**: TanStack Query 中标记缓存数据过期，触发重新获取的机制

## 背景

### 当前架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Components                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
        ┌─────────────────┐      ┌─────────────────┐
        │   Dexie Hooks   │      │  Zustand Store  │
        │ (useLiveQuery)  │      │  (selection等)   │
        └────────┬────────┘      └─────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │   Actions       │ ──────▶ 调用 db/*.db.fn.ts
        │ (业务操作)       │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │  db/*.db.fn.ts  │ ──────▶ Dexie (IndexedDB)
        │ (TaskEither)    │
        └─────────────────┘
```

### 目标架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Components                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
        ┌─────────────────┐      ┌─────────────────┐
        │ TanStack Query  │      │  Zustand Store  │
        │ (useQuery等)    │      │  (selection等)   │
        └────────┬────────┘      └─────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │   Actions       │ ──────▶ 调用 rust-api.fn.ts
        │ (useMutation)   │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ rust-api.fn.ts  │ ──────▶ Tauri invoke ──▶ Rust 后端
        │ (TaskEither)    │
        └─────────────────┘
```

## 需求

### 需求 1: Rust 后端 API 补充

**用户故事:** 作为开发者，我希望 Rust 后端提供完整的 API，以便前端可以完全脱离 IndexedDB。

#### 验收标准

1. THE Rust_Backend SHALL 提供获取根节点的 API (`get_root_nodes`)
2. THE Rust_Backend SHALL 提供按父节点获取子节点的 API (`get_nodes_by_parent`)
3. THE Rust_Backend SHALL 提供按类型获取节点的 API (`get_nodes_by_type`)
4. THE Rust_Backend SHALL 提供批量创建节点的 API (`create_nodes_batch`)
5. THE Rust_Backend SHALL 提供批量删除节点的 API (`delete_nodes_batch`)
6. THE Rust_Backend SHALL 提供重排序节点的 API (`reorder_nodes`)
7. THE Rust_Backend SHALL 提供获取下一个排序号的 API (`get_next_sort_order`)
8. THE Rust_Backend SHALL 提供获取节点后代的 API (`get_descendants`)
9. WHEN 节点被删除时，THE Rust_Backend SHALL 级联删除所有子节点和关联内容

### 需求 2: TanStack Query 集成

**用户故事:** 作为开发者，我希望使用 TanStack Query 管理数据获取和缓存，以便获得更好的开发体验和性能。

#### 验收标准

1. THE Query_System SHALL 定义统一的 Query Key 工厂函数
2. THE Query_System SHALL 为 Workspace 提供 useQuery hooks
3. THE Query_System SHALL 为 Node 提供 useQuery hooks
4. THE Query_System SHALL 为 Content 提供 useQuery hooks
5. THE Query_System SHALL 为所有写操作提供 useMutation hooks
6. WHEN mutation 成功时，THE Query_System SHALL 自动 invalidate 相关 queries
7. THE Query_System SHALL 支持乐观更新（Optimistic Updates）
8. THE Query_System SHALL 配置合理的 staleTime 和 cacheTime

### 需求 3: Workspace 数据层迁移

**用户故事:** 作为用户，我希望工作区数据存储在 SQLite 中，以便获得更好的性能和数据安全性。

#### 验收标准

1. THE Workspace_Layer SHALL 使用 TanStack Query 获取所有工作区
2. THE Workspace_Layer SHALL 使用 TanStack Query 获取单个工作区
3. THE Workspace_Layer SHALL 使用 useMutation 创建工作区
4. THE Workspace_Layer SHALL 使用 useMutation 更新工作区
5. THE Workspace_Layer SHALL 使用 useMutation 删除工作区
6. WHEN 工作区被删除时，THE Workspace_Layer SHALL 级联删除所有关联数据
7. THE Workspace_Layer SHALL 保持与现有组件的兼容性

### 需求 4: Node 数据层迁移

**用户故事:** 作为用户，我希望节点数据存储在 SQLite 中，以便文件树操作更加流畅。

#### 验收标准

1. THE Node_Layer SHALL 使用 TanStack Query 获取工作区节点
2. THE Node_Layer SHALL 使用 TanStack Query 获取子节点
3. THE Node_Layer SHALL 使用 TanStack Query 获取根节点
4. THE Node_Layer SHALL 使用 useMutation 创建节点
5. THE Node_Layer SHALL 使用 useMutation 更新节点
6. THE Node_Layer SHALL 使用 useMutation 移动节点
7. THE Node_Layer SHALL 使用 useMutation 删除节点
8. THE Node_Layer SHALL 使用 useMutation 重排序节点
9. WHEN 节点被创建时，THE Node_Layer SHALL 自动创建关联的空内容记录
10. THE Node_Layer SHALL 保持与现有文件树组件的兼容性

### 需求 5: Content 数据层迁移

**用户故事:** 作为用户，我希望文档内容存储在 SQLite 中，以便编辑器保存更加可靠。

#### 验收标准

1. THE Content_Layer SHALL 使用 TanStack Query 获取节点内容
2. THE Content_Layer SHALL 使用 useMutation 保存内容
3. THE Content_Layer SHALL 支持乐观锁（版本号检查）
4. WHEN 内容保存失败时，THE Content_Layer SHALL 提供冲突解决机制
5. THE Content_Layer SHALL 保持与 Lexical 编辑器的兼容性

### 需求 6: Actions 层迁移

**用户故事:** 作为开发者，我希望 Actions 层使用 Rust API，以便业务逻辑统一调用后端。

#### 验收标准

1. THE Actions_Layer SHALL 将所有 db/*.db.fn.ts 调用替换为 rust-api.fn.ts
2. THE Actions_Layer SHALL 保持 TaskEither 返回类型
3. THE Actions_Layer SHALL 保持现有的错误处理逻辑
4. THE Actions_Layer SHALL 保持现有的日志记录
5. WHEN action 执行成功时，THE Actions_Layer SHALL 触发相关 query invalidation

### 需求 7: 类型系统统一

**用户故事:** 作为开发者，我希望前后端类型统一，以便减少类型转换代码。

#### 验收标准

1. THE Type_System SHALL 统一 Node 类型定义
2. THE Type_System SHALL 统一 Workspace 类型定义
3. THE Type_System SHALL 统一 Content 类型定义
4. THE Type_System SHALL 提供类型转换工具函数（如需要）
5. THE Type_System SHALL 保持与现有组件的兼容性

### 需求 8: 清理旧代码

**用户故事:** 作为开发者，我希望移除所有 Dexie 相关代码，以便减少代码复杂度和包体积。

#### 验收标准

1. THE Cleanup SHALL 移除 database.ts (Dexie 实例)
2. THE Cleanup SHALL 移除所有 *.db.fn.ts 文件
3. THE Cleanup SHALL 移除 dexie 和 dexie-react-hooks 依赖
4. THE Cleanup SHALL 更新所有受影响的 import 语句
5. THE Cleanup SHALL 更新或移除相关测试文件
6. THE Cleanup SHALL 确保应用正常运行

### 需求 9: 辅助功能迁移（可选）

**用户故事:** 作为用户，我希望标签、用户、附件等功能也迁移到 SQLite。

#### 验收标准

1. IF Tag 功能需要迁移，THE Migration SHALL 添加 Tag 相关 Rust API
2. IF User 功能需要迁移，THE Migration SHALL 添加 User 相关 Rust API
3. IF Attachment 功能需要迁移，THE Migration SHALL 添加 Attachment 相关 Rust API
4. THE Migration SHALL 保持现有功能的兼容性

## 现有代码分析

### 需要迁移的 Hooks（使用 useLiveQuery）

| 文件 | Hook 数量 | 说明 |
|------|----------|------|
| use-workspace.ts | 7 | 工作区查询 |
| use-node.ts | 8 | 节点查询 |
| use-content.ts | 4 | 内容查询 |
| use-tag.ts | 9 | 标签查询 |
| use-user.ts | 13 | 用户查询 |
| use-attachment.ts | 多个 | 附件查询 |
| use-drawing.ts | 8 | 绘图查询 |
| use-wiki.ts | 1 | Wiki 查询 |

### 需要迁移的 DB 函数

| 文件 | 函数数量 | 说明 |
|------|----------|------|
| node.db.fn.ts | ~20 | 节点 CRUD + 树操作 |
| workspace.db.fn.ts | ~15 | 工作区 CRUD |
| content.db.fn.ts | ~15 | 内容 CRUD |
| tag.db.fn.ts | 多个 | 标签操作 |
| user.db.fn.ts | 多个 | 用户操作 |
| attachment.db.fn.ts | 多个 | 附件操作 |
| backup.db.fn.ts | 多个 | 备份操作 |
| clear-data.db.fn.ts | 多个 | 数据清理 |
| init.db.fn.ts | 多个 | 初始化 |

### 需要迁移的 Actions

| 目录 | 文件 | 说明 |
|------|------|------|
| node/ | create, delete, move, rename, reorder, ensure-folder | 节点操作 |
| workspace/ | create, update | 工作区操作 |
| file/ | create, open | 文件操作 |
| export/ | markdown, json, orgmode, all, project, workspace-markdown | 导出 |
| import/ | markdown, json | 导入 |
| wiki/ | migrate-wiki | Wiki 迁移 |
| templated/ | 模板化文件创建 | 日记、Wiki 等 |

### 已完成的 Rust 后端

| 模块 | 状态 | 说明 |
|------|------|------|
| Workspace CRUD | ✅ | 基础 CRUD 已完成 |
| Node CRUD | ✅ | 基础 CRUD 已完成 |
| Content CRUD | ✅ | 基础 CRUD 已完成 |
| Backup | ✅ | 备份恢复已完成 |
| 批量操作 | ❌ | 需要添加 |
| 树操作 | ❌ | 需要添加 |
| User | ❌ | 需要添加 |
| Attachment | ❌ | 需要添加 |
| Tag | ❌ | 可能不需要（存在 node.tags） |
