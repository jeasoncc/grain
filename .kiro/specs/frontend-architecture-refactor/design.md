# 前端架构重构设计

## 设计哲学

```
对象 = 纯数据（Interface + Builder 构建）
操作 = 纯函数（对数据进行变换）
流动 = 管道（pipe 连接函数）
边界 = 入口窄，出口宽
去中心化 = 没有"核心"，只有组合
```

## 水流架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         水流系统                                 │
└─────────────────────────────────────────────────────────────────┘

    外部世界（Rust 后端、浏览器存储、文件系统）
         │
         ▼
    ┌─────────┐
    │   io/   │  ← 入水口/出水口（IO 管道，连接外部）
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │ pipes/  │  ← 内部管道（纯数据转换）
    └────┬────┘
         │
         ├──────────────┐
         ▼              ▼
    ┌─────────┐    ┌─────────┐
    │ flows/  │ ←→ │ state/  │  ← 蓄水池（内部记忆）
    │(管道系统)│    └─────────┘
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │ hooks/  │  ← 水龙头（React 绑定）
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │ views/  │  ← 喷泉（UI 展示）
    └─────────┘
```

## 各层职责

| 文件夹 | 职责 | 纯函数？ | 有 IO？ | 有 React？ |
|--------|------|---------|--------|-----------|
| `views/` | UI 渲染 | ✗ | ✗ | ✓ |
| `hooks/` | React 生命周期绑定 | ✗ | ✗ | ✓ |
| `flows/` | 组合 pipes + io 形成业务流程 | ✗ | ✓ | ✗ |
| `pipes/` | 业务数据转换（纯函数） | ✓ | ✗ | ✗ |
| `io/` | 与外部世界交互 | ✗ | ✓ | ✗ |
| `state/` | 应用内部状态 | ✗ | ✗ | ✗ |
| `utils/` | 通用工具函数 | ✓ | ✗ | ✗ |
| `types/` | 类型定义 | - | - | - |

## IO 层设计

IO 层按交互目标分类：

```
io/
├── api/              # Rust 后端 API（invoke/fetch）
│   ├── client.api.ts       # 统一 API 客户端
│   ├── workspace.api.ts    # 工作区 API
│   ├── node.api.ts         # 节点 API
│   ├── content.api.ts      # 内容 API
│   ├── user.api.ts         # 用户 API
│   ├── tag.api.ts          # 标签 API
│   ├── attachment.api.ts   # 附件 API
│   ├── backup.api.ts       # 备份 API
│   └── index.ts
├── storage/          # 浏览器存储（localStorage）
│   ├── settings.storage.ts
│   └── index.ts
├── file/             # 文件系统（对话框、下载）
│   ├── dialog.file.ts
│   ├── download.file.ts
│   └── index.ts
└── index.ts
```

### IO 类型区分

| 类型 | 目标 | 特点 |
|------|------|------|
| `api/` | Rust 后端 | 跨进程，异步，可能失败 |
| `storage/` | 浏览器 localStorage | 同步，持久化 |
| `file/` | 文件系统 | 需要用户交互 |

## Pipes 层设计

Pipes 按业务领域分类：

```
pipes/
├── node/
│   ├── tree.pipe.ts        # 树结构操作
│   ├── transform.pipe.ts   # 节点转换
│   └── index.ts
├── content/
│   ├── markdown.pipe.ts    # Markdown 处理
│   ├── serialize.pipe.ts   # 序列化
│   └── index.ts
├── export/
│   ├── bundle.pipe.ts      # 打包导出
│   ├── format.pipe.ts      # 格式转换
│   └── index.ts
├── search/
│   ├── filter.pipe.ts      # 搜索过滤
│   └── index.ts
├── tag/
│   ├── parse.pipe.ts       # 标签解析
│   └── index.ts
└── index.ts
```

## Flows 层设计

Flows 组合 pipes + io 形成完整业务流程：

```
flows/
├── workspace/
│   ├── create-workspace.flow.ts
│   ├── delete-workspace.flow.ts
│   └── index.ts
├── node/
│   ├── create-node.flow.ts
│   ├── move-node.flow.ts
│   ├── delete-node.flow.ts
│   └── index.ts
├── export/
│   ├── export-markdown.flow.ts
│   ├── export-bundle.flow.ts
│   └── index.ts
├── import/
│   ├── import-markdown.flow.ts
│   └── index.ts
└── index.ts
```

## State 层设计

```
state/
├── selection.state.ts      # 选择状态
├── editor-tabs.state.ts    # 编辑器标签页
├── editor-settings.state.ts # 编辑器设置
├── sidebar.state.ts        # 侧边栏状态
├── theme.state.ts          # 主题状态
├── ui.state.ts             # UI 状态
├── save.state.ts           # 保存状态
└── index.ts
```

## Hooks 层设计

```
hooks/
├── use-workspace.ts        # 工作区 hooks（含 queries）
├── use-node.ts             # 节点 hooks（含 queries）
├── use-content.ts          # 内容 hooks（含 queries）
├── use-tag.ts              # 标签 hooks（含 queries）
├── use-selection.ts        # 选择 hooks
├── use-editor.ts           # 编辑器 hooks
├── use-keyboard.ts         # 键盘 hooks
└── index.ts
```

## 迁移策略

### 阶段 1: 创建新结构（不删除旧文件）

1. 创建新文件夹结构
2. 创建 index.ts 重导出文件

### 阶段 2: 迁移底层（types, utils, io）

1. `lib/` → `utils/`
2. `db/api-client.fn.ts` + `repo/` → `io/api/`

### 阶段 3: 迁移中间层（pipes, state）

1. `fn/` 纯函数 → `pipes/`
2. `stores/` → `state/`

### 阶段 4: 迁移上层（flows, hooks, views）

1. `actions/` → `flows/`
2. `queries/` + `hooks/` → `hooks/`
3. `components/` → `views/`

### 阶段 5: 清理

1. 删除旧文件夹
2. 更新所有 import 路径
3. 运行测试验证

## 兼容性策略

在迁移过程中，通过 index.ts 保持向后兼容：

```typescript
// 旧路径: @/repo/workspace.repo.fn
// 新路径: @/io/api/workspace.api

// repo/index.ts（临时兼容）
export * from '@/io/api/workspace.api';
```

## 角色对照表（水流比喻）

| 概念 | 文件夹 | 水流角色 | 特点 |
|-----|--------|---------|-----|
| **IO** | `io/` | 入水口/出水口 | 连接外部世界 |
| **纯管道** | `pipes/` | 内部管道 | 纯数据转换，无副作用 |
| **管道系统** | `flows/` | 管网 | 组合 pipes + io |
| **状态** | `state/` | 蓄水池 | 内部记忆 |
| **绑定** | `hooks/` | 水龙头 | 连接 React |
| **视图** | `views/` | 喷泉 | 最终展示 |
| **工具** | `utils/` | 管道配件 | 通用工具 |
| **类型** | `types/` | 水的形状 | 数据定义 |
