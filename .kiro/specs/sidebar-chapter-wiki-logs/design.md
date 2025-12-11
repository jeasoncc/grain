# Design Document

## Overview

本设计文档描述三个主要功能的技术实现方案：
1. **章节管理面板** - 在左侧统一侧边栏新增章节管理功能，替代右侧边栏
2. **Wiki 悬浮预览改进** - 增强编辑器中 Wiki 提及的悬浮预览效果
3. **日志查看器** - 在设置页面新增日志查看和管理功能

## Architecture

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        App Layout                            │
├──────┬──────────────────┬───────────────────────────────────┤
│      │                  │                                    │
│  A   │   UnifiedSidebar │         Main Content Area          │
│  c   │   ┌────────────┐ │                                    │
│  t   │   │ BooksPanel │ │   ┌─────────────────────────────┐  │
│  i   │   │ SearchPanel│ │   │      Editor / Canvas        │  │
│  v   │   │ WikiPanel  │ │   │                             │  │
│  i   │   │ DrawingsP. │ │   │  WikiHoverPreview (Portal)  │  │
│  t   │   │ ChapterP.  │ │   │                             │  │
│  y   │   └────────────┘ │   └─────────────────────────────┘  │
│  B   │                  │                                    │
│  a   │                  │   ┌─────────────────────────────┐  │
│  r   │                  │   │    Settings / LogViewer     │  │
│      │                  │   └─────────────────────────────┘  │
└──────┴──────────────────┴───────────────────────────────────┘
```

### 组件层次

```
ActivityBar
├── ActionButton (books)
├── ActionButton (search)
├── ActionButton (drawings)
├── ActionButton (wiki)
├── ActionButton (chapters) ← 新增
└── NavItem (settings)

UnifiedSidebar
├── BooksPanel
├── SearchPanel
├── DrawingsPanel
├── WikiPanel
└── ChaptersPanel ← 新增

Settings
├── DesignSettings
├── IconsSettings
├── ...
└── LogsSettings ← 新增

WikiHoverPreview ← 改进
├── PreviewCard
└── RichContentRenderer ← 新增
```

## Components and Interfaces

### 1. ChaptersPanel 组件

```typescript
// apps/desktop/src/components/panels/chapters-panel.tsx

interface ChaptersPanelProps {
  // 无需外部 props，使用 store 管理状态
}

interface ChaptersPanelState {
  searchQuery: string;
  expandedChapters: Record<string, boolean>;
  renamingId: string | null;
  dragState: DragState;
}

interface DragState {
  draggedId: string;
  draggedType: "chapter" | "scene";
  targetId: string | null;
  position: "before" | "after" | "inside" | null;
}
```

### 2. 改进的 WikiHoverPreview 组件

```typescript
// apps/desktop/src/components/editor/editor-ui/wiki-hover-preview.tsx

interface WikiHoverPreviewProps {
  entryId: string;
  anchorElement: HTMLElement;
  onClose: () => void;
}

interface PreviewCardProps {
  entry: WikiEntryInterface;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

// 新增：富文本内容渲染器
interface RichContentRendererProps {
  content: string; // Lexical JSON 字符串
  maxHeight?: number;
}
```

### 3. LogViewer 组件

```typescript
// apps/desktop/src/routes/settings/logs.tsx

interface LogViewerState {
  logs: LogEntry[];
  filter: LogLevel | "all";
  searchQuery: string;
  isLoading: boolean;
}

type LogLevel = "error" | "warn" | "info" | "debug" | "trace" | "success";

interface LogEntry {
  id?: number;
  timestamp: string;
  level: string;
  message: string;
}
```

### 4. 更新 UnifiedSidebarStore

```typescript
// apps/desktop/src/stores/unified-sidebar.ts

// 扩展面板类型
export type UnifiedSidebarPanel = 
  | "search" 
  | "books" 
  | "drawings" 
  | "wiki" 
  | "chapters"  // 新增
  | null;

// 新增章节面板状态
interface ChaptersPanelState {
  selectedProjectId: string | null;
  expandedChapters: Record<string, boolean>;
  selectedChapterId: string | null;
  selectedSceneId: string | null;
}
```

## Data Models

### 现有数据模型（无需修改）

```typescript
// ChapterInterface - 章节
interface ChapterInterface {
  id: string;
  project: string;
  title: string;
  order: number;
  open: boolean;
  showEdit: boolean;
  outline?: any;
}

// SceneInterface - 场景
interface SceneInterface {
  id: string;
  chapter: string;
  project: string;
  title: string;
  order: number;
  lastEdit: string;
  content: string | any;
  createDate?: string;
  showEdit: boolean;
  type?: SceneType;
  outline?: any;
  filePath?: string;
}

// WikiEntryInterface - Wiki 条目
interface WikiEntryInterface {
  id: string;
  project: string;
  name: string;
  alias: string[];
  tags: string[];
  content: string; // Lexical JSON
  createDate: string;
  updatedAt: string;
}

// LogEntry - 日志条目
interface LogEntry {
  id?: number;
  timestamp: string;
  level: string;
  message: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Panel State Consistency
*For any* click on the chapters button in ActivityBar, the activePanel state should be set to "chapters" and the ChaptersPanel should be rendered in the UnifiedSidebar.
**Validates: Requirements 1.1, 1.8**

### Property 2: Project-Chapter Association
*For any* project selection in ChaptersPanel, all displayed chapters should belong to that project (chapter.project === selectedProjectId).
**Validates: Requirements 1.2**

### Property 3: Chapter Creation Persistence
*For any* chapter creation operation, querying the database immediately after should return the newly created chapter with correct project association.
**Validates: Requirements 1.3**

### Property 4: Scene Creation Persistence
*For any* scene creation operation, querying the database immediately after should return the newly created scene with correct chapter association.
**Validates: Requirements 1.4**

### Property 5: Reorder Persistence
*For any* reorder operation on chapters or scenes, the new order values should be persisted and reflected in subsequent queries.
**Validates: Requirements 1.5**

### Property 6: Rename Persistence
*For any* rename operation, the new title should be persisted and returned on subsequent queries.
**Validates: Requirements 1.6**

### Property 7: Delete Persistence
*For any* delete operation, the deleted item should not exist in subsequent database queries.
**Validates: Requirements 1.7**

### Property 8: Wiki Preview Content Completeness
*For any* WikiEntryInterface, the WikiHoverPreview should display all non-empty fields: name, aliases (if present), tags (if present), and full content.
**Validates: Requirements 2.1, 2.3**

### Property 9: Rich Text Rendering
*For any* valid Lexical JSON content, the RichContentRenderer should produce valid HTML output preserving the document structure.
**Validates: Requirements 2.2**

### Property 10: Log Display Completeness
*For any* set of log entries in LogDB, the LogViewer should display all entries with timestamp, level, and message visible.
**Validates: Requirements 3.1, 3.2**

### Property 11: Log Level Color Coding
*For any* log level (error, warn, info, debug, etc.), there should be a distinct, consistent color applied in the LogViewer.
**Validates: Requirements 3.3**

### Property 12: Log Clear Operation
*For any* clear operation on logs, the LogDB should be empty after the operation completes.
**Validates: Requirements 3.4**

### Property 13: Logger Round-Trip
*For any* message logged via Logger, querying LogDB should return an entry containing that message with correct timestamp and level.
**Validates: Requirements 3.5, 4.5**

### Property 14: Log Level Filtering
*For any* log level filter selection, only logs matching that level should be displayed in the LogViewer.
**Validates: Requirements 3.6**

### Property 15: Log Search Filtering
*For any* search query, only logs containing the search term in their message should be displayed.
**Validates: Requirements 3.7**

## Error Handling

### ChaptersPanel 错误处理
- 章节/场景创建失败：显示 toast 错误消息，保持当前状态
- 删除失败：显示 toast 错误消息，不移除 UI 中的项目
- 拖拽排序失败：回滚到原始顺序，显示错误消息

### WikiHoverPreview 错误处理
- Wiki 条目加载失败：显示"加载失败"占位符
- 内容解析失败：显示原始文本或"内容无法解析"提示
- 条目已删除：显示"条目已删除"提示

### LogViewer 错误处理
- 日志加载失败：显示错误状态，提供重试按钮
- 清空失败：显示错误消息，保持当前日志列表
- 数据库连接失败：显示数据库错误提示

## Testing Strategy

### 双重测试方法

本项目采用单元测试和属性测试相结合的方法：
- **单元测试**：验证特定示例和边界情况
- **属性测试**：验证应在所有输入上成立的通用属性

### 属性测试框架

使用 **fast-check** 作为 TypeScript/JavaScript 的属性测试库。

### 测试标注格式

每个属性测试必须使用以下格式标注：
```typescript
// **Feature: sidebar-chapter-wiki-logs, Property {number}: {property_text}**
```

### 属性测试配置

每个属性测试应运行至少 100 次迭代以确保充分覆盖。

### 单元测试覆盖

1. **ChaptersPanel 单元测试**
   - 组件渲染测试
   - 用户交互测试（点击、拖拽）
   - 状态管理测试

2. **WikiHoverPreview 单元测试**
   - 内容渲染测试
   - 位置计算测试
   - 显示/隐藏逻辑测试

3. **LogViewer 单元测试**
   - 日志列表渲染测试
   - 筛选功能测试
   - 搜索功能测试
   - 清空功能测试

### 属性测试覆盖

1. **数据持久化属性测试**
   - 章节创建/删除/重命名的持久化
   - 场景创建/删除/重命名的持久化
   - 日志记录的持久化

2. **状态一致性属性测试**
   - 面板切换状态一致性
   - 项目-章节关联一致性

3. **筛选/搜索属性测试**
   - 日志级别筛选正确性
   - 日志搜索结果正确性
