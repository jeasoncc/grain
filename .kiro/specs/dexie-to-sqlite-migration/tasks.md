# 任务清单：IndexedDB (Dexie) 到 SQLite 迁移

## 概述

本任务清单基于「入口窄出口宽」的函数式异步数据流设计，将数据层从 Dexie/IndexedDB 迁移到 SQLite/TanStack Query。

核心原则：
- **读取**：TanStack Query 包装 TaskEither（唯一允许解包的地方）
- **写入**：纯 TaskEither 管道，不使用 useMutation
- **类型边界**：Codec 层负责前后端类型转换

## 阶段 1: Rust API 补充

### 任务 1.1: 添加节点查询 API ✅
- [x] 实现 `get_root_nodes` - 获取工作区根节点
- [x] 实现 `get_nodes_by_parent` - 按父节点获取子节点
- [x] 实现 `get_nodes_by_type` - 按类型获取节点
- [x] 实现 `get_descendants` - 获取节点所有后代
- [x] 添加对应的 Service 层函数
- [x] 注册到 Tauri commands
- _Requirements: 1.1, 1.2, 1.3, 1.8_

### 任务 1.2: 添加节点操作 API ✅
- [x] 实现 `get_next_sort_order` - 获取下一个排序号
- [x] 实现 `reorder_nodes` - 批量重排序节点
- [x] 实现 `delete_nodes_batch` - 批量删除节点（含级联删除）
- [x] 添加对应的 Service 层函数
- [x] 注册到 Tauri commands
- _Requirements: 1.4, 1.5, 1.6, 1.7, 1.9_

### 任务 1.3: 更新前端 Rust API 封装 ✅
- [x] 在 `rust-api.ts` 添加新 API 类型定义（后端类型）
- [x] 在 `rust-api.fn.ts` 添加新 API 调用函数（返回 TaskEither）
- [ ] 添加单元测试
- _Requirements: 1.1-1.9_

## 阶段 2: Codec 层创建 ✅

### 任务 2.1: 创建 Node Codec ✅
- [x] 创建 `src/types/codec/node.codec.ts`
- [x] 实现 `decodeNode` - NodeResponse → NodeInterface
- [x] 实现 `decodeNodes` - 批量解码
- [x] 实现 `encodeCreateNode` - NodeInterface → CreateNodeRequest
- [x] 实现 `encodeUpdateNode` - NodeInterface → UpdateNodeRequest
- [ ] 添加单元测试
- _Requirements: 7.1_

### 任务 2.2: 创建 Workspace Codec ✅
- [x] 创建 `src/types/codec/workspace.codec.ts`
- [x] 实现 `decodeWorkspace` - WorkspaceResponse → WorkspaceInterface
- [x] 实现 `decodeWorkspaces` - 批量解码
- [x] 实现 `encodeCreateWorkspace` - WorkspaceInterface → CreateWorkspaceRequest
- [x] 实现 `encodeUpdateWorkspace` - WorkspaceInterface → UpdateWorkspaceRequest
- [ ] 添加单元测试
- _Requirements: 7.2_

### 任务 2.3: 创建 Content Codec ✅
- [x] 创建 `src/types/codec/content.codec.ts`
- [x] 实现 `decodeContent` - ContentResponse → ContentInterface
- [x] 实现 `encodeCreateContent` - ContentInterface → CreateContentRequest
- [x] 实现 `encodeUpdateContent` - ContentInterface → UpdateContentRequest
- [ ] 添加单元测试
- _Requirements: 7.3_

### 任务 2.4: 创建 Codec 索引 ✅
- [x] 创建 `src/types/codec/index.ts`
- [x] 统一导出所有 codec 函数
- _Requirements: 7.4, 7.5_

## 阶段 3: Repository 层创建 ✅

### 任务 3.1: 创建 Node Repository ✅
- [x] 创建 `src/repo/node.repo.fn.ts`
- [x] 实现 `getNodesByWorkspace` - 返回 TaskEither<AppError, NodeInterface[]>
- [x] 实现 `getRootNodes` - 返回 TaskEither<AppError, NodeInterface[]>
- [x] 实现 `getChildNodes` - 返回 TaskEither<AppError, NodeInterface[]>
- [x] 实现 `getNode` - 返回 TaskEither<AppError, NodeInterface | null>
- [x] 实现 `createNode` - 返回 TaskEither<AppError, NodeInterface>
- [x] 实现 `updateNode` - 返回 TaskEither<AppError, NodeInterface>
- [x] 实现 `deleteNode` - 返回 TaskEither<AppError, void>
- [x] 实现 `moveNode` - 返回 TaskEither<AppError, NodeInterface>
- [x] 实现 `reorderNodes` - 返回 TaskEither<AppError, void>
- [ ] 添加单元测试
- _Requirements: 4.1-4.10_

### 任务 3.2: 创建 Workspace Repository ✅
- [x] 创建 `src/repo/workspace.repo.fn.ts`
- [x] 实现 `getWorkspaces` - 返回 TaskEither<AppError, WorkspaceInterface[]>
- [x] 实现 `getWorkspace` - 返回 TaskEither<AppError, WorkspaceInterface | null>
- [x] 实现 `createWorkspace` - 返回 TaskEither<AppError, WorkspaceInterface>
- [x] 实现 `updateWorkspace` - 返回 TaskEither<AppError, WorkspaceInterface>
- [x] 实现 `deleteWorkspace` - 返回 TaskEither<AppError, void>
- [ ] 添加单元测试
- _Requirements: 3.1-3.7_

### 任务 3.3: 创建 Content Repository ✅
- [x] 创建 `src/repo/content.repo.fn.ts`
- [x] 实现 `getContentByNodeId` - 返回 TaskEither<AppError, ContentInterface | null>
- [x] 实现 `createContent` - 返回 TaskEither<AppError, ContentInterface>
- [x] 实现 `updateContentByNodeId` - 返回 TaskEither<AppError, ContentInterface>
- [ ] 添加单元测试
- _Requirements: 5.1-5.5_

### 任务 3.4: 创建 Repository 索引 ✅
- [x] 创建 `src/repo/index.ts`
- [x] 统一导出所有 repository 函数

## 阶段 4: TanStack Query 集成（读取） ✅

### 任务 4.1: 创建 Query Key 工厂 ✅
- [x] 创建 `src/queries/query-keys.ts`
- [x] 定义 workspaces、nodes、contents 的 query keys
- [x] 导出类型安全的 key 工厂函数
- _Requirements: 2.1_

### 任务 4.2: 创建 Workspace Queries ✅
- [x] 创建 `src/queries/workspace.queries.ts`
- [x] 实现 `useWorkspaces` - 获取所有工作区（包装 repo.getWorkspaces）
- [x] 实现 `useWorkspace` - 获取单个工作区（包装 repo.getWorkspace）
- [x] 配置 staleTime 和 cacheTime
- _Requirements: 2.2, 2.8_

### 任务 4.3: 创建 Node Queries ✅
- [x] 创建 `src/queries/node.queries.ts`
- [x] 实现 `useNodesByWorkspace` - 获取工作区所有节点
- [x] 实现 `useRootNodes` - 获取根节点
- [x] 实现 `useChildNodes` - 获取子节点
- [x] 实现 `useNode` - 获取单个节点
- [x] 配置 staleTime 和 cacheTime
- _Requirements: 2.3, 2.8_

### 任务 4.4: 创建 Content Queries ✅
- [x] 创建 `src/queries/content.queries.ts`
- [x] 实现 `useContent` - 获取节点内容（包装 repo.getContentByNodeId）
- [x] 配置 staleTime 和 cacheTime
- _Requirements: 2.4, 2.8_

### 任务 4.5: 创建 Queries 索引 ✅
- [x] 创建 `src/queries/index.ts`
- [x] 统一导出所有 queries
- _Requirements: 2.1-2.8_

## 阶段 5: Actions 迁移（写入） ✅

### 任务 5.1: 迁移 Node Actions ✅
- [x] 迁移 `create-node.action.ts` - 使用 repo + TaskEither 管道
- [x] 迁移 `delete-node.action.ts` - 使用 repo + TaskEither 管道
- [x] 迁移 `move-node.action.ts` - 使用 repo + TaskEither 管道
- [x] 迁移 `rename-node.action.ts` - 使用 repo + TaskEither 管道
- [x] 迁移 `reorder-node.action.ts` - 使用 repo + TaskEither 管道
- [x] 迁移 `ensure-folder.action.ts` - 使用 repo + TaskEither 管道
- _Requirements: 6.1-6.5_

### 任务 5.2: 迁移 Workspace Actions ✅
- [x] 迁移 `create-workspace.action.ts` - 使用 repo + TaskEither 管道
- [x] 迁移 `update-workspace.action.ts` - 使用 repo + TaskEither 管道
- [x] 迁移 `delete-workspace.action.ts` - 使用 repo + TaskEither 管道
- _Requirements: 6.1-6.5_

### 任务 5.3: 迁移 File Actions ✅
- [x] 迁移 `create-file.action.ts` - 已使用 createNode action
- [x] 迁移 `open-file.action.ts` - 已使用 createNode action
- _Requirements: 6.1-6.5_

### 任务 5.4: 迁移 Templated Actions ✅
- [x] 迁移 `create-templated-file.action.ts` - 已使用 createFileInTree
- [x] 验证 diary、wiki 等模板创建功能
- _Requirements: 6.1-6.5_

### 任务 5.5: 迁移 Export Actions ✅
- [x] 迁移 `export-markdown.action.ts` - 使用 repo + TaskEither 管道
- _Requirements: 6.1-6.5_

### 任务 5.6: 迁移 Import Actions ✅
- [x] 迁移 `import-markdown.action.ts` - 已使用 createNode action
- _Requirements: 6.1-6.5_

## 阶段 6: 保存服务重构 ✅

### 任务 6.1: 重构保存服务 ✅
- [x] 更新 `src/services/save-service.ts` 使用 Repository 层
- [x] 实现 `debounceSave` - 防抖保存
- [x] 实现 `saveImmediately` - 立即保存（返回 TaskEither）
- [x] 实现 `flushPendingSaves` - 刷新所有待保存
- [x] 实现 `cancelPendingSave` - 取消待保存
- [x] 实现 `getPendingSaveCount` - 获取待保存数量
- _Requirements: 5.2, 5.3_

### 任务 6.2: 更新编辑器组件使用新保存服务
- [ ] 更新 Lexical 编辑器使用新 saveService
- [ ] 更新 Excalidraw 编辑器使用新 saveService
- [ ] 更新 Code 编辑器使用新 saveService
- [ ] 更新 Diagram 编辑器使用新 saveService
- _Requirements: 5.5_

### 任务 6.3: 移除旧保存服务
- [ ] 移除 `unified-save.service.ts`
- [ ] 更新所有 import 语句
- _Requirements: 8.1_

## 阶段 7: Hooks 迁移 ✅

### 任务 7.1: 迁移 use-workspace.ts ✅
- [x] 替换 `useLiveQuery` 为 TanStack Query hooks
- [ ] 更新所有使用该 hook 的组件
- [ ] 验证功能正常
- _Requirements: 3.1-3.7_

### 任务 7.2: 迁移 use-node.ts ✅
- [x] 替换 `useLiveQuery` 为 TanStack Query hooks
- [ ] 更新文件树组件
- [ ] 验证节点操作功能
- _Requirements: 4.1-4.10_

### 任务 7.3: 迁移 use-content.ts ✅
- [x] 替换 `useLiveQuery` 为 TanStack Query hooks
- [ ] 更新编辑器组件
- [ ] 验证内容保存功能
- _Requirements: 5.1-5.5_

### 任务 7.4: 迁移 use-drawing.ts ✅
- [x] 替换 `useLiveQuery` 为 TanStack Query hooks
- [ ] 更新 Excalidraw 组件
- [ ] 验证绘图功能
- _Requirements: 4.1-4.10_

### 任务 7.5: 迁移 use-wiki.ts ✅
- [x] 替换 `useLiveQuery` 为 TanStack Query hooks
- [ ] 更新 Wiki 相关组件
- _Requirements: 4.1-4.10_

## 阶段 8: 清理旧代码

### 任务 8.1: 移除 Dexie 数据库文件
- [ ] 移除 `database.ts`
- [ ] 移除 `node.db.fn.ts`
- [ ] 移除 `workspace.db.fn.ts`
- [ ] 移除 `content.db.fn.ts`
- [ ] 移除 `tag.db.fn.ts`
- [ ] 移除 `user.db.fn.ts`
- [ ] 移除 `attachment.db.fn.ts`
- [ ] 移除 `backup.db.fn.ts`
- [ ] 移除 `clear-data.db.fn.ts`
- [ ] 移除 `init.db.fn.ts`
- _Requirements: 8.1_

### 任务 8.2: 移除 Dexie 依赖
- [ ] 从 `package.json` 移除 `dexie`
- [ ] 从 `package.json` 移除 `dexie-react-hooks`
- [ ] 运行 `bun install` 更新 lockfile
- _Requirements: 8.2, 8.3_

### 任务 8.3: 更新 Import 语句
- [ ] 搜索并更新所有 `from '@/db/'` 的 import
- [ ] 搜索并更新所有 `from 'dexie-react-hooks'` 的 import
- [ ] 验证无编译错误
- _Requirements: 8.4_

### 任务 8.4: 更新测试文件
- [ ] 更新或移除 `*.db.fn.test.ts` 文件
- [ ] 添加 queries 的测试文件
- [ ] 添加 repo 的测试文件
- [ ] 添加 codec 的测试文件
- [ ] 运行测试确保通过
- _Requirements: 8.5_

### 任务 8.5: 最终验证
- [ ] 运行 `bun run lint`
- [ ] 运行 `bun run check`
- [ ] 运行 `bun run test`
- [ ] 手动测试核心功能：
  - [ ] 创建/删除工作区
  - [ ] 创建/删除/移动节点
  - [ ] 编辑/保存内容
  - [ ] 文件树展开/折叠
  - [ ] 导入/导出功能
- _Requirements: 8.6_

## 可选任务

### 任务 O.1: Tag 功能迁移
- [ ] 添加 Tag 相关 Rust API
- [ ] 创建 Tag codec
- [ ] 创建 Tag repository
- [ ] 创建 Tag queries
- [ ] 迁移 use-tag.ts
- _Requirements: 9.1_

### 任务 O.2: User 功能迁移
- [ ] 添加 User 相关 Rust API
- [ ] 创建 User codec
- [ ] 创建 User repository
- [ ] 创建 User queries
- [ ] 迁移 use-user.ts
- _Requirements: 9.2_

### 任务 O.3: Attachment 功能迁移
- [ ] 添加 Attachment 相关 Rust API
- [ ] 创建 Attachment codec
- [ ] 创建 Attachment repository
- [ ] 创建 Attachment queries
- [ ] 迁移 use-attachment.ts
- _Requirements: 9.3_

## 依赖关系

```
阶段 1 (Rust API)
    │
    ▼
阶段 2 (Codec 层)
    │
    ▼
阶段 3 (Repository 层)
    │
    ├──────────────────────────────────┐
    ▼                                  ▼
阶段 4 (Query Hooks - 读取)      阶段 5 (Actions - 写入)
    │                                  │
    │                                  ▼
    │                            阶段 6 (保存服务重构)
    │                                  │
    └──────────────────┬───────────────┘
                       ▼
                 阶段 7 (Hooks 迁移)
                       │
                       ▼
                 阶段 8 (清理)
```

## 预估工时

| 阶段 | 预估时间 | 说明 |
|------|---------|------|
| 阶段 1: Rust API | 4-6 小时 | 后端 API 补充 |
| 阶段 2: Codec 层 | 2-3 小时 | 类型转换函数 |
| 阶段 3: Repository 层 | 3-4 小时 | 纯函数数据访问 |
| 阶段 4: Query Hooks | 2-3 小时 | TanStack Query 读取 |
| 阶段 5: Actions | 4-6 小时 | TaskEither 写入管道 |
| 阶段 6: 保存服务 | 3-4 小时 | 重构为 TaskEither |
| 阶段 7: Hooks | 3-4 小时 | 迁移现有 hooks |
| 阶段 8: 清理 | 2-3 小时 | 移除旧代码 |
| **总计** | **23-33 小时** | |

## 目录结构变更

```
src/
├── types/
│   ├── node/
│   │   ├── node.interface.ts      # 前端类型定义（不变）
│   │   └── ...
│   ├── rust-api.ts                # Rust API 类型（后端类型）
│   └── codec/                     # 【新增】类型转换边界
│       ├── node.codec.ts
│       ├── workspace.codec.ts
│       ├── content.codec.ts
│       └── index.ts
│
├── db/
│   ├── rust-api.fn.ts             # Tauri invoke 封装（返回 Rust 类型）
│   └── *.db.fn.ts                 # 【待删除】Dexie 函数
│
├── repo/                          # 【新增】Repository 层
│   ├── node.repo.fn.ts            # 节点仓库（返回前端类型）
│   ├── workspace.repo.fn.ts
│   ├── content.repo.fn.ts
│   └── index.ts
│
├── queries/                       # 【新增】TanStack Query hooks（读取）
│   ├── query-keys.ts
│   ├── node.queries.ts
│   ├── workspace.queries.ts
│   ├── content.queries.ts
│   └── index.ts
│
├── fn/
│   └── save/
│       ├── unified-save.service.ts  # 【待删除】旧保存服务
│       └── save.service.fn.ts       # 【新增】TaskEither 保存服务
│
├── actions/                       # 业务操作（写入，TaskEither 管道）
│   └── ...                        # 迁移为使用 repo
│
└── hooks/                         # 其他 React hooks
    └── ...                        # 迁移为使用 queries
```
