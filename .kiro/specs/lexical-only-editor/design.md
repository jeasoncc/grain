# Design Document: Lexical Only Editor

## Overview

本设计文档描述将 Grain 编辑器统一为 Lexical 的重构方案，移除 Tiptap、Monaco、CodeMirror 等其他编辑器实现，简化架构。

### 设计目标

1. **简化架构** - 移除多编辑器支持，统一使用 Lexical
2. **减少包体积** - 删除未使用的编辑器包
3. **降低维护成本** - 只需维护一套编辑器代码
4. **提高稳定性** - 避免 Tiptap ProseMirror 等兼容性问题
5. **向后兼容** - 保持现有文档格式兼容

## Architecture

### 重构前架构

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              当前编辑器架构（复杂）                                    │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────┐
                                    │   apps/desktop  │
                                    └────────┬────────┘
                                             │
                          ┌─────────────────────────────────────┐
                          │         @grain/editor-core          │
                          │         (统一接口层)                 │
                          │                                     │
                          │  ┌─────────────────────────────┐   │
                          │  │ EditorProvider              │   │
                          │  │ EditorSelector              │   │
                          │  │ editor-settings.store       │   │
                          │  └─────────────────────────────┘   │
                          └──────────────────┬──────────────────┘
                                             │
          ┌──────────────────┬───────────────┼───────────────┬──────────────────┐
          │                  │               │               │                  │
          ▼                  ▼               ▼               ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ editor-lexical  │ │ editor-tiptap   │ │ editor-monaco   │ │editor-codemirror│ │excalidraw-editor│
│ ✅ 保留         │ │ ❌ 删除         │ │ ❌ 删除         │ │ ❌ 删除         │ │ ✅ 保留         │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 重构后架构

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              目标编辑器架构（简化）                                    │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────┐
                                    │   apps/desktop  │
                                    └────────┬────────┘
                                             │
                          ┌─────────────────────────────────────┐
                          │         @grain/editor-core          │
                          │         (简化后的核心层)             │
                          │                                     │
                          │  ┌─────────────────────────────┐   │
                          │  │ SerializedContent           │   │
                          │  │ FileTypeResolver            │   │
                          │  │ (移除 EditorSelector)       │   │
                          │  │ (移除 EditorProvider)       │   │
                          │  └─────────────────────────────┘   │
                          └──────────────────┬──────────────────┘
                                             │
                    ┌────────────────────────┴────────────────────────┐
                    │                                                │
                    ▼                                                ▼
          ┌─────────────────┐                              ┌─────────────────┐
          │ editor-lexical  │                              │excalidraw-editor│
          │                 │                              │                 │
          │ ├── /document   │                              │ (独立，无替代)  │
          │ ├── /code       │                              │                 │
          │ └── /diagram    │                              │                 │
          └─────────────────┘                              └─────────────────┘
```

## 删除清单

### 1. 删除的包

| 包名 | 路径 | 原因 |
|------|------|------|
| `@grain/editor-tiptap` | `packages/editor-tiptap/` | ProseMirror 兼容性问题 |
| `@grain/editor-monaco` | `packages/editor-monaco/` | 包体积大，功能重复 |
| `@grain/editor-codemirror` | `packages/editor-codemirror/` | 功能重复 |

### 2. 删除的组件

| 组件 | 路径 | 原因 |
|------|------|------|
| TiptapEditorContainer | `apps/desktop/src/components/tiptap-editor/` | 使用 Lexical 替代 |
| CodeMirrorEditorContainer | `apps/desktop/src/components/codemirror-editor/` | 使用 Lexical 替代 |
| CodeMirrorCodeEditorContainer | `apps/desktop/src/components/codemirror-code-editor/` | 使用 Lexical 替代 |
| CodeMirrorDiagramEditorContainer | `apps/desktop/src/components/codemirror-diagram-editor/` | 使用 Lexical 替代 |

### 3. 删除的配置

| 文件 | 路径 | 原因 |
|------|------|------|
| editor-settings.store.ts | `apps/desktop/src/stores/` | 不再需要编辑器选择 |
| editor-settings.interface.ts | `apps/desktop/src/types/editor-settings/` | 不再需要编辑器配置类型 |
| editor.tsx (设置页面) | `apps/desktop/src/routes/settings/` | 不再需要编辑器设置页面 |

### 4. 简化的文件

| 文件 | 路径 | 修改内容 |
|------|------|----------|
| editor-selector.tsx | `packages/editor-core/src/components/` | 删除或简化 |
| editor-provider.tsx | `packages/editor-core/src/components/` | 删除或简化 |
| config.interface.ts | `packages/editor-core/src/types/` | 移除编辑器类型选择 |
| story-workspace.container.fn.tsx | `apps/desktop/src/components/story-workspace/` | 直接使用 Lexical |

## 数据流变化

### 重构前

```
用户选择编辑器类型
        │
        ▼
┌─────────────────┐
│ editor-settings │
│    .store.ts    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ EditorSelector  │ ──▶ 根据设置选择编辑器
└────────┬────────┘
         │
    ┌────┴────┬────────┬────────┐
    ▼         ▼        ▼        ▼
 Lexical   Tiptap   Monaco  CodeMirror
```

### 重构后

```
打开文件
    │
    ▼
┌─────────────────┐
│ FileTypeResolver│ ──▶ 根据文件类型选择编辑模式
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Lexical Editor  │
│                 │
│ ├── document    │ ──▶ .grain, .note, .md
│ ├── code        │ ──▶ .js, .ts, .py, etc.
│ └── diagram     │ ──▶ .mermaid, .plantuml
└─────────────────┘
```

## Lexical 编辑器能力

### 文档编辑 (Document)

| 功能 | 支持 | 实现方式 |
|------|------|----------|
| 富文本格式 | ✅ | @lexical/rich-text |
| 标题 (H1-H6) | ✅ | HeadingNode |
| 列表 | ✅ | @lexical/list |
| 任务列表 | ✅ | @lexical/list |
| 代码块 | ✅ | @lexical/code |
| 引用块 | ✅ | QuoteNode |
| 链接 | ✅ | @lexical/link |
| 表格 | ✅ | @lexical/table |
| 图片 | ✅ | ImageNode (自定义) |
| Mentions | ✅ | MentionNode (自定义) |
| Tags | ✅ | TagNode (自定义) |
| Wiki Links | ✅ | WikiLinkNode (自定义) |

### 代码编辑 (Code)

| 功能 | 支持 | 实现方式 |
|------|------|----------|
| 语法高亮 | ✅ | @lexical/code + Prism |
| 多语言支持 | ✅ | 通过 Prism 语言包 |
| 行号 | ⚠️ | 需要自定义实现 |
| 代码折叠 | ❌ | 不支持 |
| 自动补全 | ❌ | 不支持 |

### 图表编辑 (Diagram)

| 功能 | 支持 | 实现方式 |
|------|------|----------|
| Mermaid 语法 | ✅ | 代码块 + Mermaid 渲染 |
| PlantUML 语法 | ✅ | 代码块 + PlantUML 渲染 |
| 实时预览 | ✅ | 自定义预览组件 |

## 实现步骤

### Phase 1: 删除编辑器配置

1. 删除 `apps/desktop/src/stores/editor-settings.store.ts`
2. 删除 `apps/desktop/src/types/editor-settings/`
3. 删除 `apps/desktop/src/routes/settings/editor.tsx`
4. 更新设置页面路由，移除编辑器设置入口

### Phase 2: 删除未使用的组件

1. 删除 `apps/desktop/src/components/tiptap-editor/`
2. 删除 `apps/desktop/src/components/codemirror-editor/`
3. 删除 `apps/desktop/src/components/codemirror-code-editor/`
4. 删除 `apps/desktop/src/components/codemirror-diagram-editor/`

### Phase 3: 更新 story-workspace

1. 移除编辑器选择逻辑
2. 直接使用 Lexical 编辑器
3. 根据文件类型选择 Lexical 的不同模式

### Phase 4: 删除编辑器包

1. 删除 `packages/editor-tiptap/`
2. 删除 `packages/editor-monaco/`
3. 删除 `packages/editor-codemirror/`
4. 更新根 `package.json` workspaces
5. 更新 `apps/desktop/package.json` 依赖

### Phase 5: 简化 editor-core

1. 移除 `EditorSelector` 组件
2. 移除 `EditorProvider` 组件
3. 简化 `config.interface.ts`
4. 保留 `SerializedContent` 和 `FileTypeResolver`

## 向后兼容

### 数据格式兼容

- Lexical 使用 JSON 格式存储编辑器状态
- 现有 `.grain` 文件已使用 Lexical JSON 格式
- 无需数据迁移

### 功能兼容

| 原编辑器 | 功能 | Lexical 替代方案 |
|---------|------|-----------------|
| Tiptap | 富文本 | Lexical 原生支持 |
| Monaco | 代码编辑 | Lexical @lexical/code |
| Monaco | Markdown 预览 | Lexical + 自定义预览 |
| CodeMirror | 轻量代码编辑 | Lexical @lexical/code |

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Lexical 代码编辑功能较弱 | 中 | 对于专业代码编辑，建议使用外部编辑器 |
| 用户习惯改变 | 低 | Lexical 已是默认编辑器 |
| 包删除后无法回滚 | 低 | Git 版本控制可恢复 |

## 测试策略

### 功能测试

1. 文档编辑：创建、编辑、保存 .grain 文件
2. 代码编辑：创建、编辑代码块
3. 图表编辑：创建、编辑 Mermaid 图表
4. 现有文档：打开现有文档验证兼容性

### 回归测试

1. 验证所有现有功能正常工作
2. 验证设置页面正常（移除编辑器选项后）
3. 验证应用启动正常
