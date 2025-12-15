# Tag 系统设计文档 (Simplified Org-mode Style)

## 概述

Tag 系统采用 org-mode 风格的简化设计：
- 在文档头部使用 `#+TAGS: tag1, tag2, tag3` 定义标签
- 标签存储在 `nodes.tags` 数组中（数据源）
- `tags` 表仅作为聚合缓存（统计和图谱）
- 保存时自动提取标签并同步到数据库

## 设计原则

1. **定义简单**：直接在文档中输入 `#+TAGS:` 行
2. **存储丰富**：数据库索引支持高效查询
3. **功能强大**：支持信息检索和图谱可视化

## 数据模型

### 1. nodes 表 - 标签存储（数据源）

```typescript
interface NodeInterface {
  id: UUID;
  workspace: UUID;
  parent: UUID | null;
  type: NodeType;
  title: string;
  order: number;
  collapsed?: boolean;
  createDate: ISODateString;
  lastEdit: ISODateString;
  tags?: string[];  // ← 标签数组，从 #+TAGS: 提取
}
```

数据库索引：`"id, workspace, parent, type, order, *tags"`
- `*tags` 是 Dexie 的 multi-entry 索引，支持高效的标签查询

### 2. tags 表 - 聚合缓存

```typescript
interface TagInterface {
  id: string;           // workspace:tagName
  name: string;         // 标签名
  workspace: UUID;      // 所属工作区
  count: number;        // 使用次数
  lastUsed: ISODateString;
  createDate: ISODateString;
}
```

数据库索引：`"id, workspace, name"`

## 工作流程

### 1. 标签定义

在文档开头输入：
```
#+TAGS: 日记, 工作, 想法
#+TITLE: 今日笔记
#+DATE: 2025-01-01
```

按 Enter 后，`#+TAGS:` 行会转换为 `FrontMatterNode`，显示为美观的标签样式。

### 2. 保存时同步

```
用户编辑 → 保存触发 → 提取 #+TAGS: → 更新 nodes.tags → 同步 tags 缓存
```

### 3. 标签查询

```typescript
// 按标签查找文档（使用 multi-entry 索引）
const nodes = await database.nodes
  .where("tags")
  .equals("日记")
  .and(node => node.workspace === workspaceId)
  .toArray();
```

### 4. 图谱可视化

基于 `nodes.tags` 计算标签共现关系：
- 同一文档中的标签形成边
- 边的权重 = 共现次数

## 文件结构

```
apps/desktop/src/
├── db/
│   ├── database.ts                    # 数据库定义 (v9)
│   └── models/
│       └── tag/
│           ├── index.ts               # 统一导出
│           └── tag.interface.ts       # Tag 接口
├── services/
│   ├── save.ts                        # 保存服务（含标签提取）
│   └── tags.ts                        # 标签服务（缓存同步、查询）
├── components/
│   ├── editor/
│   │   ├── nodes/
│   │   │   └── front-matter-node.tsx  # #+KEY: value 渲染
│   │   └── plugins/
│   │       └── front-matter-plugin.tsx # 前置内容解析
│   └── panels/
│       └── tag-graph-panel.tsx        # 标签图谱
```

## 使用方式

### 1. 定义标签

在文档开头输入：
```
#+TAGS: 角色, 设定, 第一章
```

按 Enter，自动转换为 FrontMatterNode。

### 2. 查看标签图谱

点击侧边栏的 Tags 图标，查看标签关系图谱。

### 3. API 使用

```typescript
import {
  // Hooks
  useTagsByWorkspace,
  useNodesByTag,
  useTagGraph,
  
  // Functions
  getNodesByTag,
  getTagGraphData,
  rebuildTagCache,
} from "@/services/tags";

// 按标签查找文档
const nodes = useNodesByTag(workspaceId, "日记");

// 获取图谱数据
const graphData = useTagGraph(workspaceId);
```

## 性能优化

1. **Multi-entry 索引**：`*tags` 索引支持 O(log n) 的标签查询
2. **增量同步**：保存时只更新变化的标签
3. **缓存表**：`tags` 表避免每次都扫描所有节点
4. **懒加载**：图谱数据按需计算

## 与旧版对比

| 特性 | 旧版 (v8) | 新版 (v9) |
|------|-----------|-----------|
| 标签定义 | 侧边栏输入框 | 文档内 #+TAGS: |
| 数据源 | nodeTags 关联表 | nodes.tags 数组 |
| 标签属性 | 颜色、类别、图标 | 仅名称 |
| 关系存储 | tagRelations 表 | 动态计算共现 |
| 复杂度 | 高（3张表） | 低（1张缓存表） |

## 迁移说明

从 v8 升级到 v9：
1. `nodeTags` 和 `tagRelations` 表会被删除
2. 需要手动在文档中添加 `#+TAGS:` 行
3. 可运行 `rebuildTagCache(workspaceId)` 重建缓存
