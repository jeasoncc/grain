# Design Document: Wiki System Integration & Excalidraw Improvements

## Overview

本设计文档描述了 Novel Editor 桌面应用的 Wiki 系统整合与 Excalidraw 绘图功能改进方案。主要包括：

1. **代码清理** - 移除残留的角色（characters）和世界观（world）模块
2. **Wiki 功能完善** - 增强 @ 自动补全和添加悬浮预览功能
3. **Excalidraw 修复** - 解决绘图显示问题并优化界面集成

## Architecture

### 当前架构问题

```
┌─────────────────────────────────────────────────────────────┐
│                        Routes                               │
├─────────────────────────────────────────────────────────────┤
│  /characters  │  /world  │  /canvas  │  其他路由...         │
│  (废弃但存在)  │ (废弃但存在)│           │                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     数据模型混乱                             │
├─────────────────────────────────────────────────────────────┤
│  RoleInterface (废弃)  │  WorldEntryInterface (废弃)        │
│  WikiEntryInterface (当前使用)                              │
└─────────────────────────────────────────────────────────────┘
```

### 目标架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Routes                               │
├─────────────────────────────────────────────────────────────┤
│  /canvas  │  /settings  │  /outline  │  其他路由...         │
│           │             │            │                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     统一数据模型                             │
├─────────────────────────────────────────────────────────────┤
│  WikiEntryInterface (唯一的知识管理模型)                     │
│  - id, projectId, name, alias[], tags[], content           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     编辑器集成                               │
├─────────────────────────────────────────────────────────────┤
│  MentionNode (@ 提及)  │  HoverPreview (悬浮预览)           │
│  ExcalidrawNode (绘图) │  ExcalidrawComponent (绘图组件)    │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. 需要删除的文件

```
apps/desktop/src/routes/characters.tsx  # 角色页面路由
apps/desktop/src/routes/world.tsx       # 世界观页面路由
```

### 2. 需要修改的文件

#### Activity Bar 修改
```typescript
// apps/desktop/src/components/activity-bar.tsx
// 移除角色和世界观相关的按钮
// 保留 Wiki 面板切换功能
```

#### 路由配置修改
```typescript
// apps/desktop/src/routeTree.gen.ts
// 移除 /characters 和 /world 路由的生成
```

### 3. Wiki 悬浮预览组件

```typescript
// apps/desktop/src/components/editor/editor-ui/wiki-hover-preview.tsx
interface WikiHoverPreviewProps {
  entryId: string;
  anchorElement: HTMLElement;
  onClose: () => void;
}

interface PreviewContent {
  name: string;
  alias: string[];
  tags: string[];
  summary: string; // 截断后的内容摘要
}
```

### 4. Mention Node 增强

```typescript
// apps/desktop/src/components/editor/nodes/mention-node.tsx
// 增强 MentionNode 以支持悬浮预览
interface MentionNodeProps {
  name: string;
  entryId: string;
  // 新增：支持悬浮预览的事件处理
}
```

### 5. Excalidraw 组件修复

```typescript
// apps/desktop/src/components/editor/editor-ui/excalidraw-component.tsx
// 修复显示问题
// 移除"在外部打开"按钮
// 优化尺寸计算和错误处理
```

## Data Models

### WikiEntryInterface (保留并使用)

```typescript
interface WikiEntryInterface {
  id: string;           // Wiki条目唯一标识
  project: string;      // 所属项目 ID
  name: string;         // 条目名称
  alias: string[];      // 别名列表
  tags: string[];       // 标签列表
  content: string;      // 详细描述内容 (Lexical JSON)
  createdAt: number;    // 创建时间
  updatedAt: number;    // 更新时间
}
```

### 废弃的数据模型 (需要清理引用)

```typescript
// @deprecated - 已被 WikiEntryInterface 替代
interface RoleInterface { ... }

// @deprecated - 已被 WikiEntryInterface 替代  
interface WorldEntryInterface { ... }
```

### 悬浮预览数据模型

```typescript
interface HoverPreviewState {
  isVisible: boolean;
  entryId: string | null;
  position: { x: number; y: number };
  delayTimer: number | null;
}

// 内容摘要截断配置
const SUMMARY_MAX_LENGTH = 150; // 最大字符数
const SUMMARY_ELLIPSIS = "...";
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Wiki 条目 CRUD 操作一致性
*For any* Wiki 条目和有效的操作序列（创建、更新名称/别名/标签、删除），执行操作后查询数据库应该返回与操作一致的结果
**Validates: Requirements 2.1, 2.2, 2.3, 2.5**

### Property 2: Wiki 过滤匹配正确性
*For any* 查询字符串和 Wiki 条目列表，过滤结果应该只包含名称、别名或标签中包含查询字符串的条目
**Validates: Requirements 3.2, 3.3**

### Property 3: 悬浮预览内容完整性
*For any* Wiki 条目，悬浮预览应该包含条目的名称、别名列表和内容摘要，且摘要长度不超过预设最大值
**Validates: Requirements 4.2, 4.3**

### Property 4: 绘图数据持久化一致性
*For any* Excalidraw 绘图数据，保存后重新加载应该得到等价的绘图元素和状态
**Validates: Requirements 5.4, 5.5**

### Property 5: 全屏模式状态保持
*For any* 绘图编辑操作，在全屏模式下进行的更改在退出全屏后应该被保留
**Validates: Requirements 7.4**

## Error Handling

### Wiki 相关错误

1. **条目不存在**: 当悬浮预览请求的条目不存在时，显示"条目已删除"提示
2. **内容解析失败**: 当 Lexical JSON 解析失败时，显示原始文本或空内容
3. **项目未选择**: 当没有选择项目时，禁用 Wiki 相关功能并显示提示

### Excalidraw 相关错误

1. **组件加载失败**: 使用 Suspense 和 fallback UI 处理懒加载失败
2. **数据解析错误**: 当绘图数据损坏时，显示空白画布并记录错误
3. **保存失败**: 显示错误提示并保留本地更改，允许重试

```typescript
// 错误边界处理
class ExcalidrawErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return <div className="error-fallback">绘图加载失败，请刷新页面</div>;
    }
    return this.props.children;
  }
}
```

## Testing Strategy

### 单元测试

1. **Wiki 服务测试**
   - 测试 createWikiEntry, updateWikiEntry, deleteWikiEntry 函数
   - 测试过滤和搜索逻辑

2. **组件测试**
   - 测试 WikiHoverPreview 组件的渲染和交互
   - 测试 MentionNode 的悬浮事件处理
   - 测试 ExcalidrawComponent 的模式切换

### 属性测试

使用 fast-check 进行属性测试：

1. **Wiki CRUD 属性测试**: 验证任意操作序列后数据一致性
2. **过滤匹配属性测试**: 验证过滤结果的正确性
3. **内容截断属性测试**: 验证摘要长度约束
4. **绘图数据属性测试**: 验证保存/加载的一致性

### 集成测试

1. **@ 自动补全流程测试**: 测试从输入到选择的完整流程
2. **悬浮预览流程测试**: 测试悬停、显示、隐藏的完整流程
3. **绘图编辑流程测试**: 测试创建、编辑、保存的完整流程

## Implementation Notes

### 悬浮预览实现细节

```typescript
// 使用 Floating UI 或 Radix UI 的 HoverCard 实现
// 延迟显示：300ms
// 延迟隐藏：150ms
// 最大宽度：320px
// 内容摘要：150字符

const HOVER_DELAY_SHOW = 300;
const HOVER_DELAY_HIDE = 150;
const PREVIEW_MAX_WIDTH = 320;
```

### Excalidraw 修复要点

1. **尺寸问题**: 确保容器有明确的宽高，使用 ResizeObserver 监听变化
2. **主题同步**: 使用 useTheme hook 获取当前主题并传递给 Excalidraw
3. **错误处理**: 添加 try-catch 包装所有 Excalidraw API 调用
4. **移除外部打开**: 在 UIOptions 中禁用相关功能

```typescript
// Excalidraw UIOptions 配置
const uiOptions = {
  canvasActions: {
    export: false,        // 禁用导出到外部
    loadScene: false,     // 禁用加载外部场景
    saveToActiveFile: false,
    // 移除任何"在外部打开"相关选项
  },
};
```

### 代码清理检查清单

- [ ] 删除 `apps/desktop/src/routes/characters.tsx`
- [ ] 删除 `apps/desktop/src/routes/world.tsx`
- [ ] 更新 Activity Bar 移除相关按钮
- [ ] 清理 schema.ts 中的废弃接口注释
- [ ] 更新 unified-sidebar.ts 移除废弃的面板类型
- [ ] 检查并移除所有对 RoleInterface 和 WorldEntryInterface 的引用

