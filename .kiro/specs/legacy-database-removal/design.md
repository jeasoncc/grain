# 设计文档

## 概述

本设计文档描述了如何完全移除 Grain 桌面应用中的 Dexie/IndexedDB 遗留数据库代码，并将所有数据访问替换为 SQLite API 调用。由于所有数据已经存在于 SQLite 后端，这是一个代码清理和替换任务，而不是数据迁移任务。

## 架构

### 当前架构问题

```
┌─────────────────┐    ┌─────────────────┐
│   应用层        │    │   应用层        │
├─────────────────┤    ├─────────────────┤
│ Backup Flow     │───▶│ Dexie Database  │ ❌ 遗留代码
│ Export Flow     │    │ (IndexedDB)     │
│ Wiki Flow       │    └─────────────────┘
└─────────────────┘    
        │              
        ▼              
┌─────────────────┐    
│ SQLite Backend  │ ✅ 现代架构
│ (Rust + Tauri)  │    
└─────────────────┘    
```

### 目标架构

```
┌─────────────────┐    
│   应用层        │    
├─────────────────┤    
│ Backup Flow     │    
│ Export Flow     │───▶┌─────────────────┐
│ Wiki Flow       │    │ SQLite Backend  │ ✅ 统一数据访问
└─────────────────┘    │ (Rust + Tauri)  │
                       └─────────────────┘
```

## 组件和接口

### 需要替换的文件

#### 1. 备份流程 (`flows/backup/backup.flow.ts`)

**当前 Dexie 调用:**
```typescript
// ❌ 需要替换
const [users, workspaces, nodes, contents, attachments, tags] = await Promise.all([
  database.users.toArray(),
  database.workspaces.toArray(), 
  database.nodes.toArray(),
  database.contents.toArray(),
  database.attachments.toArray(),
  database.tags.toArray(),
])
```

**替换为 SQLite API:**
```typescript
// ✅ 使用 SQLite API
import { createBackup } from "@/io/api/backup.api"

export const createBackup = (): TE.TaskEither<AppError, BackupInfo> => 
  api.createBackup()
```

#### 2. 导出流程 (`flows/export/export-project.flow.ts`)

**当前 Dexie 调用:**
```typescript
// ❌ 需要替换
const project = await legacyDatabase.workspaces.get(projectId)
const nodes = await legacyDatabase.nodes.where("workspace").equals(projectId).toArray()
```

**替换为 SQLite API:**
```typescript
// ✅ 使用 SQLite API
import { getWorkspace } from "@/io/api/workspace.api"
import { getNodesByWorkspace } from "@/io/api/node.api"

const project = await getWorkspace(projectId)()
const nodes = await getNodesByWorkspace(projectId)()
```

#### 3. Wiki 流程 (`flows/wiki/`)

**当前 Dexie 调用:**
```typescript
// ❌ 需要替换
const nodes = await legacyDatabase.nodes
  .where("tags")
  .equals(WIKI_TAG)
  .toArray()
```

**替换为 SQLite API:**
```typescript
// ✅ 使用 SQLite API  
import { getNodesByTag } from "@/io/api/node.api"

const nodes = await getNodesByTag(WIKI_TAG)()
```

#### 4. 迁移流程 (`flows/migration/dexie-to-sqlite.migration.fn.ts`)

**处理方式:** 
- 移除所有 Dexie 相关的迁移检查和清理代码
- 保留 SQLite 相关的迁移逻辑
- 简化迁移状态检查

### SQLite API 映射

| Dexie 操作 | SQLite API | 说明 |
|-----------|------------|------|
| `database.workspaces.toArray()` | `getWorkspaces()` | 获取所有工作区 |
| `database.workspaces.get(id)` | `getWorkspace(id)` | 获取单个工作区 |
| `database.nodes.toArray()` | `getNodes()` | 获取所有节点 |
| `database.nodes.where("workspace").equals(id)` | `getNodesByWorkspace(id)` | 按工作区获取节点 |
| `database.nodes.where("tags").equals(tag)` | `getNodesByTag(tag)` | 按标签获取节点 |
| `database.contents.toArray()` | `getContents()` | 获取所有内容 |
| `database.users.toArray()` | `getUsers()` | 获取所有用户 |
| `database.attachments.toArray()` | `getAttachments()` | 获取所有附件 |

## 数据模型

### 备份数据结构

保持现有的 `BackupData` 接口不变，但数据来源从 Dexie 改为 SQLite：

```typescript
interface BackupData {
  metadata: BackupMetadata
  workspaces: WorkspaceInterface[]
  nodes: NodeInterface[]
  contents: ContentInterface[]
  users: UserInterface[]
  attachments: AttachmentInterface[]
  tags: TagInterface[]
  dbVersions: DBVersionInterface[]
}
```

### 导出数据结构

保持现有的导出格式不变，确保向后兼容性。

## 实现计划

### 阶段 1: 替换备份功能

1. **更新 `backup.flow.ts`**
   - 移除 `legacyDatabase` 导入
   - 使用 SQLite `createBackup` API
   - 使用 SQLite `restoreBackup` API
   - 保持相同的用户接口

2. **更新 `clear-data.flow.ts`**
   - 移除 IndexedDB 清理逻辑
   - 只保留 SQLite 清理调用
   - 移除 localStorage 清理（如果不需要）

### 阶段 2: 替换导出功能

1. **更新 `export-project.flow.ts`**
   - 替换所有 Dexie 数据访问为 SQLite API
   - 使用 `getWorkspace`, `getNodesByWorkspace`, `getContentsByNodeIds`
   - 保持相同的导出格式和用户体验

### 阶段 3: 处理 Wiki 功能

1. **评估 Wiki 功能需求**
   - 检查 Wiki 功能是否仍在使用
   - 如果需要：替换为 SQLite API
   - 如果不需要：完全移除相关代码

2. **更新或移除 Wiki 流程**
   - `get-wiki-files.flow.ts`
   - `migrate-wiki.flow.ts`

### 阶段 4: 清理迁移系统

1. **更新 `dexie-to-sqlite.migration.fn.ts`**
   - 移除 Dexie 数据检查逻辑
   - 移除 Dexie 数据清理逻辑
   - 简化迁移状态管理

### 阶段 5: 完全移除 Dexie

1. **删除文件**
   - `src/io/db/legacy-database.ts`
   - 更新 `src/io/db/index.ts`

2. **清理依赖**
   - 从 `package.json` 移除 `dexie`
   - 移除所有 Dexie 相关导入

3. **更新测试**
   - 移除 Dexie 模拟
   - 更新测试以验证 SQLite API 使用

## 错误处理

### 错误处理策略

1. **API 调用失败**
   - 使用现有的 `TaskEither` 错误处理模式
   - 提供清晰的错误消息
   - 记录详细的错误日志

2. **数据不一致**
   - 在替换过程中验证数据完整性
   - 提供回退机制（如果可能）

3. **向后兼容性**
   - 保持现有的文件格式
   - 确保导出/导入功能继续工作

## 测试策略

### 双重测试方法
- **单元测试**: 验证特定示例、边缘情况和错误条件
- **属性测试**: 验证所有输入的通用属性
- 两者互补且都是全面覆盖所必需的

### 单元测试

1. **备份功能测试**
   - 验证 SQLite API 调用
   - 测试备份数据格式
   - 测试错误处理

2. **导出功能测试**
   - 验证数据检索逻辑
   - 测试导出格式
   - 测试边缘情况

3. **代码清理验证**
   - 验证 Dexie 引用已移除
   - 验证依赖已清理

### 属性测试

1. **代码静态分析测试**
   - 最少 100 次迭代验证代码库中无 Dexie 引用
   - 标签: **Feature: legacy-database-removal, Property 1: 代码库 Dexie 清理完整性**

2. **API 使用一致性测试**
   - 最少 100 次迭代验证所有数据访问使用 SQLite API
   - 标签: **Feature: legacy-database-removal, Property 2: SQLite API 使用一致性**

3. **功能完整性测试**
   - 最少 100 次迭代验证核心功能正常工作
   - 标签: **Feature: legacy-database-removal, Property 8: 功能完整性保持**

### 集成测试

1. **端到端备份测试**
   - 创建备份 → 恢复备份 → 验证数据
   - 测试不同的备份格式

2. **导出功能测试**
   - 创建项目 → 导出 → 验证导出内容

### 回归测试

1. **功能完整性**
   - 确保所有现有功能继续工作
   - 验证用户体验保持一致

2. **性能测试**
   - 确保 SQLite API 性能满足要求
   - 对比替换前后的性能指标

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式声明。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

基于需求分析，以下是需要验证的核心正确性属性：

### 属性 1: 代码库 Dexie 清理完整性
*对于任何* 代码文件，该文件不应包含对 `legacyDatabase`、`dexie`、或 `IndexedDB` 的引用
**验证: 需求 1.2, 2.4, 3.3, 4.3, 5.3, 7.1, 7.3**

### 属性 2: SQLite API 使用一致性  
*对于任何* 数据访问操作，系统应使用相应的 SQLite API 而不是 Dexie API
**验证: 需求 2.1, 2.2, 3.1, 6.1, 6.2, 6.3, 6.4**

### 属性 3: 备份数据完整性
*对于任何* 备份操作，生成的备份应包含所有必要的数据字段且格式正确
**验证: 需求 3.2, 3.4**

### 属性 4: 运行时 IndexedDB 隔离
*对于任何* 应用执行会话，系统不应尝试连接或初始化 IndexedDB 数据库
**验证: 需求 1.4, 5.1**

### 属性 5: 迁移系统 SQLite 依赖
*对于任何* 迁移操作，系统应只依赖 SQLite 后端并在日志中反映这一点
**验证: 需求 5.2, 5.4**

### 属性 6: Wiki 代码清理一致性
*对于任何* Wiki 相关功能，如果保留则应使用 SQLite API，如果移除则不应留下孤立代码
**验证: 需求 4.1, 4.2, 4.4**

### 属性 7: 测试套件 SQLite 验证
*对于任何* 测试用例，测试应验证 SQLite API 使用且不包含 Dexie 模拟或引用
**验证: 需求 7.2, 7.4**

### 属性 8: 功能完整性保持
*对于任何* 核心功能（启动、数据操作、备份、导出），功能应正常工作且不出现 Dexie 相关错误
**验证: 需求 8.1, 8.2, 8.3, 8.4**